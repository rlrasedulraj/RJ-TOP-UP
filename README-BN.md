# RJ TOP UP — Multi-App Development Starter

এই সংস্করণে Free Fire, IMO, PUBG Mobile, Mobile Legends, TikTok ও Likee-এর নমুনা ক্যাটালগ রয়েছে। IMO-তে দুটি আলাদা অ্যাকাউন্ট শনাক্তকরণ অপশন আছে: IMO User ID এবং IMO অ্যাকাউন্ট নম্বর। পেমেন্ট কেবল বিকাশ পারসোনাল ও নগদ পারসোনাল।

## চালানোর নিয়ম
1. Node.js 20+ ইনস্টল করুন।
2. `npm install`
3. `.env.example` থেকে `.env` তৈরি করে শক্তিশালী `ADMIN_PASSWORD` ও `SESSION_SECRET` সেট করুন।
4. `npm start` চালান।
5. `http://localhost:3000` এবং `http://localhost:3000/admin.html` খুলুন।

## প্রথমবারের সেটআপ
- Admin Panel-এ লগইন করে বিকাশ ও নগদ পারসোনাল নম্বর সেট করুন।
- সব প্যাকেজের মূল্য শুরুতে ০ রাখা হয়েছে। আপনার প্রকৃত ক্রয়মূল্য/বিক্রয়মূল্য যাচাই করে Admin Panel থেকে মূল্য বসান। ০ মূল্যের প্যাকেজে অর্ডার নেওয়া বন্ধ।
- IMO-এর দুইটি আলাদা প্যাকেজ-লাইন আছে, যাতে গ্রাহক User ID অথবা IMO অ্যাকাউন্ট নম্বর—যেকোনো একটি দিয়ে অর্ডার করতে পারেন।
- এই নমুনা ক্যাটালগে থাকা সব অ্যাপের জন্য প্রকৃত সরবরাহকারী/অনুমোদিত টপ-আপ চ্যানেল নিশ্চিত না হওয়া পর্যন্ত বিক্রি শুরু করবেন না।

## নিরাপত্তা ও প্রকাশ
এটি development starter, hosted live store বা production-ready system নয়। HTTPS hosting, persistent secure sessions, CSRF protection, admin audit logs, database backup, monitoring, privacy policy, terms এবং security review প্রয়োজন। Payment transaction ID অ্যাডমিনকে সংশ্লিষ্ট wallet app-এ নিজে যাচাই করতে হবে। PIN/OTP/password কখনো সংগ্রহ করবেন না।

## Android
`capacitor.config.json` Android wrapper তৈরির প্রাথমিক কনফিগ। APK তৈরি করতে Capacitor CLI, Android Studio, JDK/Android SDK, live HTTPS backend URL, app icons, signing key এবং device testing প্রয়োজন। এই ZIP-এ APK binary অন্তর্ভুক্ত নেই।
