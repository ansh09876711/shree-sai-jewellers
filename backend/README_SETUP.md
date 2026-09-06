# 💎 Complete Backend & Services Setup Guide — Shree Sai Jewellers

This guide details how to configure and deploy all services: **Supabase PostgreSQL**, **Flask REST API**, **Razorpay**, **Cloudinary**, and **Resend**.

---

## 1. 🗄️ Supabase PostgreSQL Setup

Your Supabase Project URL: `https://sddrmokboatatwgbohkp.supabase.co`  
Project Reference: `sddrmokboatatwgbohkp`

### Step 1.1: Run Database Schema
1. Open your [Supabase Dashboard](https://supabase.com/dashboard/project/sddrmokboatatwgbohkp).
2. Go to **SQL Editor** in the left sidebar.
3. Open [`backend/schema.sql`](file:///c:/Users/ANSH%20AGARWAL/Desktop/SHREE%20SAI%20JEWELLERS/backend/schema.sql) from this project, copy the entire SQL code, paste it into the editor, and click **Run**.
4. All tables (`products`, `categories`, `banners`, `rates`, `offers`, `reviews`, `orders`, `order_items`, `coupons`, `contacts`, `store_info`) will be created instantly.

### Step 1.2: Get Database Connection URI
1. In Supabase Dashboard, go to **Project Settings** (gear icon) -> **Database**.
2. Scroll to **Connection String** -> Select **URI** (or **Transaction Pooler**).
3. Copy the string. It looks like:
   ```env
   DATABASE_URL=postgresql://postgres:[YOUR-DB-PASSWORD]@db.sddrmokboatatwgbohkp.supabase.co:5432/postgres
   ```
4. Paste this into your `backend/.env` file.

---

## 2. 💳 Razorpay Payment Gateway Setup

1. Sign up / Log in to [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Go to **Account & Settings** -> **API Keys** -> **Generate Key**.
3. Copy **Key ID** and **Key Secret**.
4. In `backend/.env`:
   ```env
   RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXX
   RAZORPAY_KEY_SECRET=your_secret_key_here
   ```
5. In `config.js` (Frontend):
   ```javascript
   RAZORPAY_KEY: 'rzp_test_XXXXXXXXXXXX' // Key ID only!
   ```

---

## 3. 🖼️ Cloudinary Media CDN Setup

1. Create a free account at [Cloudinary Console](https://cloudinary.com/users/register_free).
2. On the Dashboard, copy **Cloud Name**, **API Key**, and **API Secret**.
3. In `backend/.env`:
   ```env
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

---

## 4. 📧 Resend (Transactional Emails) Setup

1. Create a free account at [Resend.com](https://resend.com).
2. Go to **API Keys** -> **Create API Key**.
3. In `backend/.env`:
   ```env
   RESEND_API_KEY=re_123456789abcdef
   MAIL_SENDER=orders@yourdomain.com # Or onboarding@resend.dev for testing
   ADMIN_EMAIL=care@shreesaijewellers.com
   ```

---

## 5. 🚀 Running Backend Locally & Seeding Data

```bash
# 1. Navigate to project root
cd "c:\Users\ANSH AGARWAL\Desktop\SHREE SAI JEWELLERS"

# 2. Install Python dependencies
pip install -r backend/requirements.txt

# 3. Create .env from example
cp backend/.env.example backend/.env
# (Edit backend/.env with your Supabase DATABASE_URL and keys)

# 4. Populate initial database with Fine Jewellery Catalog
python -m backend.seed

# 5. Start Flask Backend Server
python -m backend.app
```
The REST API will run at `http://127.0.0.1:5000`.

---

## 6. 🌐 Free Production Deployment

### Backend on Render (Free)
1. Push this repository to GitHub.
2. Go to [Render.com](https://render.com) -> **New Web Service**.
3. Connect your repository. Render will automatically detect `render.yaml`.
4. Add your Environment Variables (`DATABASE_URL`, `RAZORPAY_KEY_ID`, `CLOUDINARY_CLOUD_NAME`, `RESEND_API_KEY`, etc.).
5. Click **Deploy**. Your API will be live at `https://shree-sai-jewellers-api.onrender.com`.

### Frontend on Cloudflare Pages / Vercel (Free)
1. In `config.js`, update `API_BASE_URL` with your live Render backend URL:
   ```javascript
   API_BASE_URL: 'https://shree-sai-jewellers-api.onrender.com/api'
   ```
2. Deploy to [Vercel](https://vercel.com) or [Cloudflare Pages](https://pages.cloudflare.com) by connecting your repository.
3. Link your custom domain (`shreesaijewellers.com`).
