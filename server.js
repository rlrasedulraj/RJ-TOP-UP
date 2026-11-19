const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

const app = express();
const db = new Database(process.env.DB_FILE || 'rj-top-up.sqlite');
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!ADMIN_PASSWORD || !SESSION_SECRET) {
  console.error('Set ADMIN_PASSWORD and SESSION_SECRET before starting.');
  process.exit(1);
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/', rateLimit({ windowMs: 60 * 1000, limit: 60 }));

db.exec(`
CREATE TABLE IF NOT EXISTS packages (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 app_key TEXT NOT NULL DEFAULT 'freefire',
 app_name TEXT NOT NULL DEFAULT 'Free Fire',
 title TEXT NOT NULL,
 identifier_mode TEXT NOT NULL DEFAULT 'player_id',
 identifier_label TEXT NOT NULL DEFAULT 'Player ID',
 price INTEGER NOT NULL DEFAULT 0,
 active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS orders (
 id TEXT PRIMARY KEY, app_key TEXT NOT NULL, app_name TEXT NOT NULL,
 identifier_mode TEXT NOT NULL, identifier_value TEXT NOT NULL,
 package_id INTEGER NOT NULL, package_title TEXT NOT NULL, amount INTEGER NOT NULL,
 payment_method TEXT NOT NULL, sender_number TEXT NOT NULL, transaction_id TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'নতুন অর্ডার', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY, password_hash TEXT NOT NULL);
`);

function ensureColumn(table, name, declaration) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!cols.includes(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${declaration}`);
}
ensureColumn('packages','app_key',"TEXT NOT NULL DEFAULT 'freefire'");
ensureColumn('packages','app_name',"TEXT NOT NULL DEFAULT 'Free Fire'");
ensureColumn('packages','identifier_mode',"TEXT NOT NULL DEFAULT 'player_id'");
ensureColumn('packages','identifier_label',"TEXT NOT NULL DEFAULT 'Player ID'");
ensureColumn('orders','app_key',"TEXT NOT NULL DEFAULT 'freefire'");
ensureColumn('orders','app_name',"TEXT NOT NULL DEFAULT 'Free Fire'");
ensureColumn('orders','identifier_mode',"TEXT NOT NULL DEFAULT 'player_id'");
ensureColumn('orders','identifier_value',"TEXT NOT NULL DEFAULT ''");

const count = db.prepare('SELECT COUNT(*) n FROM packages').get().n;
if (!count) {
  const add = db.prepare(`INSERT INTO packages(app_key,app_name,title,identifier_mode,identifier_label,price,active)
    VALUES(?,?,?,?,?,?,1)`);
  [
    ['freefire','Free Fire','25 Diamonds','player_id','Player ID',0],
    ['freefire','Free Fire','100 Diamonds','player_id','Player ID',0],
    ['freefire','Free Fire','210 Diamonds','player_id','Player ID',0],
    ['imo','IMO','IMO Diamonds - Basic','imo_user_id','IMO User ID',0],
    ['imo','IMO','IMO Diamonds - Basic','imo_phone','IMO অ্যাকাউন্ট নম্বর',0],
    ['pubg','PUBG Mobile','UC Package','player_id','PUBG Player ID',0],
    ['mlbb','Mobile Legends','Diamonds Package','player_id','User ID',0],
    ['tiktok','TikTok','Coins Package','user_id','TikTok User ID',0],
    ['likee','Likee','Diamonds Package','user_id','Likee User ID',0]
  ].forEach(x=>add.run(...x));
}
const adminHash = bcrypt.hashSync(ADMIN_PASSWORD, 12);
db.prepare('INSERT OR REPLACE INTO admins(id,password_hash) VALUES(1,?)').run(adminHash);
for (const [k,v] of [['bkash','আপনার বিকাশ পারসোনাল নম্বর যোগ করুন'],['nagad','আপনার নগদ পারসোনাল নম্বর যোগ করুন']]) {
  db.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)').run(k,v);
}

const sessions = new Map();
function auth(req,res,next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/,'');
  const record = sessions.get(token);
  if (!record || record.expires < Date.now()) return res.status(401).json({error:'আবার অ্যাডমিন লগইন করুন'});
  next();
}
app.get('/api/public-data',(req,res)=>{
  const packages=db.prepare('SELECT id,app_key,app_name,title,identifier_mode,identifier_label,price FROM packages WHERE active=1 ORDER BY app_name,price').all();
  const payments=Object.fromEntries(db.prepare("SELECT key,value FROM settings WHERE key IN ('bkash','nagad')").all().map(x=>[x.key,x.value]));
  res.json({packages,payments,apps:[...new Map(packages.map(p=>[p.app_key,{key:p.app_key,name:p.app_name}])).values()]});
});
app.post('/api/orders',(req,res)=>{
  const {packageId,identifierMode,identifierValue,paymentMethod,senderNumber,transactionId}=req.body||{};
  if (!['বিকাশ','নগদ'].includes(paymentMethod)) return res.status(400).json({error:'শুধু বিকাশ ও নগদ গ্রহণ করা হয়'});
  if (!/^[0-9+\- ]{8,20}$/.test(String(senderNumber||''))) return res.status(400).json({error:'সঠিক প্রেরকের নম্বর দিন'});
  if (!/^[A-Za-z0-9-]{6,30}$/.test(String(transactionId||''))) return res.status(400).json({error:'সঠিক Transaction ID দিন'});
  const pkg=db.prepare('SELECT * FROM packages WHERE id=? AND active=1').get(Number(packageId));
  if (!pkg) return res.status(400).json({error:'প্যাকেজ পাওয়া যায়নি'});
  if (!pkg.price || pkg.price<1) return res.status(400).json({error:'এই প্যাকেজের মূল্য অ্যাডমিন এখনো নির্ধারণ করেননি'});
  if (identifierMode!==pkg.identifier_mode) return res.status(400).json({error:'সঠিক অ্যাকাউন্ট শনাক্তকরণ পদ্ধতি নির্বাচন করুন'});
  const value=String(identifierValue||'').trim();
  if (value.length<5 || value.length>40) return res.status(400).json({error:'সঠিক User ID বা অ্যাকাউন্ট নম্বর দিন'});
  if (pkg.identifier_mode==='imo_phone' && !/^[0-9+ -]{8,20}$/.test(value)) return res.status(400).json({error:'সঠিক IMO অ্যাকাউন্ট নম্বর দিন'});
  if (pkg.identifier_mode!=='imo_phone' && !/^[A-Za-z0-9._-]{5,40}$/.test(value)) return res.status(400).json({error:'সঠিক User ID দিন'});
  const id='RJ'+Date.now().toString().slice(-8)+crypto.randomBytes(2).toString('hex').toUpperCase();
  db.prepare(`INSERT INTO orders(id,app_key,app_name,identifier_mode,identifier_value,package_id,package_title,amount,payment_method,sender_number,transaction_id,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,pkg.app_key,pkg.app_name,pkg.identifier_mode,value,pkg.id,pkg.title,pkg.price,paymentMethod,String(senderNumber).trim(),String(transactionId).trim(),new Date().toISOString());
  res.json({ok:true,orderId:id,message:'অর্ডার জমা হয়েছে। পেমেন্ট ও অ্যাকাউন্ট তথ্য যাচাইয়ের পর প্রসেস হবে।'});
});
app.get('/api/orders/:id',(req,res)=>{
  const o=db.prepare('SELECT id,app_name,package_title,amount,status,created_at FROM orders WHERE id=?').get(req.params.id);
  if(!o)return res.status(404).json({error:'অর্ডার পাওয়া যায়নি'});res.json(o);
});
app.post('/api/admin/login',(req,res)=>{
  const row=db.prepare('SELECT password_hash FROM admins WHERE id=1').get();
  if(!req.body?.password||!bcrypt.compareSync(req.body.password,row.password_hash))return res.status(401).json({error:'পাসওয়ার্ড সঠিক নয়'});
  const token=crypto.randomBytes(32).toString('hex');sessions.set(token,{expires:Date.now()+8*60*60*1000});res.json({token});
});
app.get('/api/admin/orders',auth,(req,res)=>res.json(db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 500').all()));
app.patch('/api/admin/orders/:id',auth,(req,res)=>{
  const allowed=['নতুন অর্ডার','পেমেন্ট যাচাই','সম্পন্ন','বাতিল'];
  if(!allowed.includes(req.body.status))return res.status(400).json({error:'অবৈধ স্ট্যাটাস'});
  const r=db.prepare('UPDATE orders SET status=? WHERE id=?').run(req.body.status,req.params.id);
  if(!r.changes)return res.status(404).json({error:'অর্ডার পাওয়া যায়নি'});res.json({ok:true});
});
app.put('/api/admin/packages/:id',auth,(req,res)=>{
  const price=Number(req.body.price);if(!Number.isInteger(price)||price<0||price>1000000)return res.status(400).json({error:'সঠিক মূল্য দিন'});
  const r=db.prepare('UPDATE packages SET price=? WHERE id=?').run(price,req.params.id);
  if(!r.changes)return res.status(404).json({error:'প্যাকেজ পাওয়া যায়নি'});res.json({ok:true});
});
app.put('/api/admin/payments/:method',auth,(req,res)=>{
  const key=req.params.method;if(!['bkash','nagad'].includes(key))return res.status(400).json({error:'শুধু বিকাশ ও নগদ সমর্থিত'});
  const value=String(req.body.number||'').trim();if(!/^[0-9+ -]{8,20}$/.test(value))return res.status(400).json({error:'সঠিক নম্বর দিন'});
  db.prepare('UPDATE settings SET value=? WHERE key=?').run(value,key);res.json({ok:true});
});
app.listen(PORT,()=>console.log(`RJ TOP UP running on port ${PORT}`));
