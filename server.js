const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

// Helper to ensure data files exist
function ensureDataFile(filename, defaultData = []) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
  }
  return filePath;
}

const productsFile = ensureDataFile('products.json');
const ordersFile = ensureDataFile('orders.json');
const messagesFile = ensureDataFile('messages.json');
const subscribersFile = ensureDataFile('subscribers.json');

function readJson(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    return [];
  }
}

function writeJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${file}:`, err);
    return false;
  }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 2e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // ---------------------------------------------------------
  // REST API: GET /api/products
  // ---------------------------------------------------------
  if (req.method === 'GET' && pathname === '/api/products') {
    const products = readJson(productsFile);
    return sendJson(res, 200, { success: true, count: products.length, products });
  }

  // ---------------------------------------------------------
  // REST API: GET /api/products/:id
  // ---------------------------------------------------------
  if (req.method === 'GET' && pathname.startsWith('/api/products/')) {
    const id = parseInt(pathname.split('/')[3], 10);
    const products = readJson(productsFile);
    const product = products.find(p => p.id === id);
    if (!product) {
      return sendJson(res, 404, { success: false, error: 'Product not found' });
    }
    return sendJson(res, 200, { success: true, product });
  }

  // ---------------------------------------------------------
  // REST API: POST /api/cart/validate
  // ---------------------------------------------------------
  if (req.method === 'POST' && pathname === '/api/cart/validate') {
    const body = await parseBody(req);
    const { items = [], couponCode = '' } = body;
    const products = readJson(productsFile);

    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const prod = products.find(p => p.id === item.id);
      if (prod) {
        const itemTotal = prod.price * item.quantity;
        subtotal += itemTotal;
        const availableStock = prod.stock[item.size] || 0;
        validatedItems.push({
          ...item,
          name: prod.name,
          unitPrice: prod.price,
          totalPrice: itemTotal,
          inStock: availableStock >= item.quantity,
          availableStock
        });
      }
    }

    let discount = 0;
    let couponApplied = null;
    const upperCoupon = (couponCode || '').trim().toUpperCase();

    if (upperCoupon === 'KHUBAIB10') {
      discount = Math.round(subtotal * 0.10);
      couponApplied = { code: 'KHUBAIB10', discountPercent: 10, amount: discount };
    } else if (upperCoupon === 'DROP01') {
      discount = Math.round(subtotal * 0.15);
      couponApplied = { code: 'DROP01', discountPercent: 15, amount: discount };
    }

    const shipping = subtotal > 100 || subtotal === 0 ? 0 : 15;
    const grandTotal = Math.max(0, subtotal - discount + shipping);

    return sendJson(res, 200, {
      success: true,
      subtotal,
      discount,
      shipping,
      grandTotal,
      couponApplied,
      items: validatedItems
    });
  }

  // ---------------------------------------------------------
  // REST API: POST /api/orders
  // ---------------------------------------------------------
  if (req.method === 'POST' && pathname === '/api/orders') {
    const body = await parseBody(req);
    const { customer = {}, items = [], paymentMethod = 'card', couponCode = '' } = body;

    if (!items || items.length === 0) {
      return sendJson(res, 400, { success: false, error: 'Cannot create order with an empty bag.' });
    }
    if (!customer.fullName || !customer.email || !customer.street) {
      return sendJson(res, 400, { success: false, error: 'Full name, email, and shipping address are required.' });
    }

    const products = readJson(productsFile);
    let subtotal = 0;

    // Check & deduct inventory
    for (const item of items) {
      const prod = products.find(p => p.id === item.id);
      if (!prod) {
        return sendJson(res, 400, { success: false, error: `Product ID ${item.id} not found.` });
      }
      const currentStock = prod.stock[item.size] || 0;
      if (currentStock < item.quantity) {
        return sendJson(res, 400, {
          success: false,
          error: `Insufficient stock for ${prod.name} in size ${item.size}. Available: ${currentStock}`
        });
      }
      prod.stock[item.size] -= item.quantity;
      subtotal += prod.price * item.quantity;
    }

    // Apply coupon
    let discount = 0;
    const upperCoupon = (couponCode || '').trim().toUpperCase();
    if (upperCoupon === 'KHUBAIB10') discount = Math.round(subtotal * 0.10);
    else if (upperCoupon === 'DROP01') discount = Math.round(subtotal * 0.15);

    const shipping = subtotal > 100 ? 0 : 15;
    const total = subtotal - discount + shipping;

    const orderId = 'KB-' + Math.floor(10000 + Math.random() * 90000);
    const newOrder = {
      id: orderId,
      createdAt: new Date().toISOString(),
      customer: {
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone || '',
        street: customer.street,
        city: customer.city || '',
        postalCode: customer.postalCode || '',
        country: customer.country || 'Pakistan'
      },
      items,
      subtotal,
      discount,
      shipping,
      total,
      paymentMethod,
      status: 'Confirmed',
      estimatedDelivery: '3 - 5 Business Days'
    };

    // Save updated stock & new order
    writeJson(productsFile, products);
    const orders = readJson(ordersFile);
    orders.unshift(newOrder);
    writeJson(ordersFile, orders);

    return sendJson(res, 201, {
      success: true,
      message: 'Order placed successfully.',
      order: newOrder
    });
  }

  // ---------------------------------------------------------
  // REST API: GET /api/orders
  // ---------------------------------------------------------
  if (req.method === 'GET' && pathname === '/api/orders') {
    const orders = readJson(ordersFile);
    return sendJson(res, 200, { success: true, count: orders.length, orders });
  }

  // ---------------------------------------------------------
  // REST API: GET /api/orders/:id
  // ---------------------------------------------------------
  if (req.method === 'GET' && pathname.startsWith('/api/orders/')) {
    const orderId = pathname.split('/')[3];
    const orders = readJson(ordersFile);
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      return sendJson(res, 404, { success: false, error: 'Order not found' });
    }
    return sendJson(res, 200, { success: true, order });
  }

  // ---------------------------------------------------------
  // REST API: POST /api/contact
  // ---------------------------------------------------------
  if (req.method === 'POST' && pathname === '/api/contact') {
    const body = await parseBody(req);
    const { name, email, subject, message } = body;

    if (!name || !email || !message) {
      return sendJson(res, 400, { success: false, error: 'Name, email, and message are required.' });
    }

    const messages = readJson(messagesFile);
    const newMsg = {
      id: 'MSG-' + Date.now(),
      createdAt: new Date().toISOString(),
      name,
      email,
      subject: subject || 'General Inquiry',
      message
    };
    messages.unshift(newMsg);
    writeJson(messagesFile, messages);

    return sendJson(res, 200, {
      success: true,
      message: 'Your message has been received by Khubaib Studio. We will respond within 24 hours.'
    });
  }

  // ---------------------------------------------------------
  // REST API: POST /api/newsletter
  // ---------------------------------------------------------
  if (req.method === 'POST' && pathname === '/api/newsletter') {
    const body = await parseBody(req);
    const { email } = body;

    if (!email || !email.includes('@')) {
      return sendJson(res, 400, { success: false, error: 'A valid email address is required.' });
    }

    const subscribers = readJson(subscribersFile);
    if (!subscribers.some(s => s.email.toLowerCase() === email.toLowerCase())) {
      subscribers.push({ email, subscribedAt: new Date().toISOString() });
      writeJson(subscribersFile, subscribers);
    }

    return sendJson(res, 200, {
      success: true,
      message: 'You have been added to the Khubaib VIP drop alert list.'
    });
  }

  // ---------------------------------------------------------
  // Static File Serving (index.html and assets)
  // ---------------------------------------------------------
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(__dirname, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=UTF-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('Internal Server Error');
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  KHUBAIB STREETWEAR - SERVER IS LIVE`);
  console.log(`======================================================`);
  console.log(`  Website URL: http://localhost:${PORT}`);
  console.log(`  REST API:    http://localhost:${PORT}/api/products`);
  console.log(`  Data folder: ${DATA_DIR}`);
  console.log(`======================================================\n`);
});
