# Betwise - Sports Predictions & Referral SaaS Platform

A complete monorepo SaaS platform for sports predictions with referral system, built with Node.js, Express, Prisma, PostgreSQL, Next.js, and Stripe integration.

## 🚀 Features

### Backend
- **Authentication**: JWT-based auth with register, login, forgot password
- **Role-based Access Control**: USER and ADMIN roles
- **Subscription Management**: Stripe integration with Basic, Premium, VIP plans
- **Referral System**: Unique referral codes with commission tracking
- **Sports Predictions**: CRUD operations with filtering and pagination
- **Payment Processing**: Stripe webhooks and payment history
- **Admin Panel**: User management, subscription control, payment reports

### Frontend
- **Public Pages**: Landing page, pricing, authentication
- **User Dashboard**: Predictions, subscription management, referral tracking
- **Admin Dashboard**: Complete platform management interface
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Real-time Updates**: Toast notifications and loading states

### Database Schema
- **Users**: Authentication, roles, referral codes
- **Subscriptions**: Plan management with Stripe integration  
- **Referrals**: Commission tracking and earnings
- **Predictions**: Sports predictions with odds and metadata
- **Payments**: Transaction history and payouts

## 🛠 Tech Stack

**Backend:**
- Node.js 20+ with Express.js
- Prisma ORM with PostgreSQL
- JWT authentication
- Stripe payment processing
- Nodemailer for emails

**Frontend:**
- Next.js 14+ with TypeScript
- Tailwind CSS for styling
- React Hook Form for forms
- Axios for API calls
- React Hot Toast for notifications

**Infrastructure:**
- Docker for development
- PostgreSQL database
- Redis for caching (optional)

## 📦 Installation & Setup

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- npm or yarn

### 1. Clone and Install
```bash
git clone <repository-url>
cd betwise-monorepo
npm install
```

### 2. Database Setup
```bash
# Start PostgreSQL and Redis
npm run docker:up

# Copy environment files
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.local.example packages/frontend/.env.local

# Run database migrations
npm run db:migrate

# Seed demo data
npm run db:seed
```

### 3. Environment Configuration

**Backend (.env):**
```env
DATABASE_URL="postgresql://betwise:betwise123@localhost:5432/betwise"
JWT_SECRET="your-super-secret-jwt-key-here"
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
FRONTEND_URL="http://localhost:3000"
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

### 4. Start Development
```bash
# Start both backend and frontend
npm run dev

# Or start individually
npm run dev:backend
npm run dev:frontend
```

## 🔐 Demo Accounts

After running `npm run db:seed`:

**Admin Account:**
- Email: `admin@betwise.com`
- Password: `admin123`

**Test User:**
- Email: `user1@example.com` 
- Password: `user123`

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login  
- `POST /api/auth/forgot-password` - Password reset
- `GET /api/auth/me` - Get current user

### Subscriptions
- `POST /api/subscriptions/create` - Create subscription
- `POST /api/subscriptions/cancel` - Cancel subscription
- `GET /api/subscriptions/status` - Get subscription status

### Referrals
- `GET /api/referrals/my` - Get user referrals
- `GET /api/referrals/stats` - Get referral statistics

### Predictions
- `GET /api/predictions` - List predictions (public)
- `POST /api/predictions` - Create prediction (admin)
- `GET /api/predictions/:id` - Get single prediction
- `PUT /api/predictions/:id` - Update prediction (admin)
- `DELETE /api/predictions/:id` - Delete prediction (admin)

### Payments
- `GET /api/payments/history` - Payment history
- `POST /api/payments/payout` - Request payout
- `GET /api/payments/all` - All payments (admin)

### Admin
- `GET /api/admin/stats` - Platform statistics
- `GET /api/admin/users` - User management
- `GET /api/admin/subscriptions` - Subscription management

## 💳 Stripe Integration

### Setup Stripe Webhooks
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward events: `stripe listen --forward-to localhost:3001/api/stripe/webhook`
4. Copy webhook secret to `.env`

### Test Payment Flow
1. Visit `/pricing` and select a plan
2. Use test card: `4242 4242 4242 4242`
3. Any future date and CVC
4. Complete checkout process

## 🏗 Project Structure

```
betwise-monorepo/
├── packages/
│   ├── backend/                 # Node.js API
│   │   ├── src/
│   │   │   ├── routes/         # API routes
│   │   │   ├── middleware/     # Auth & validation
│   │   │   └── utils/          # Helper functions
│   │   ├── prisma/             # Database schema & migrations
│   │   └── package.json
│   └── frontend/               # Next.js app
│       ├── app/                # App router pages
│       ├── components/         # React components  
│       ├── contexts/           # React contexts
│       ├── lib/               # Utility functions
│       └── package.json
├── docker-compose.yml          # PostgreSQL & Redis
└── package.json               # Root package.json
```

## 🔄 Referral System

### How it Works
1. Each user gets a unique referral code on registration
2. Users share referral links: `/register?ref=REFERRAL_CODE`
3. When referred users subscribe, referrer earns commission
4. Commission rates: Basic (10%), Premium (15%), VIP (20%)
5. Payouts available when earnings reach $10 minimum

### Commission Calculation
```javascript
const commissionAmount = subscriptionPrice * referralCommissionRate;
```

## 🎯 Subscription Plans

| Feature | Basic ($9.99) | Premium ($19.99) | VIP ($39.99) |
|---------|---------------|------------------|--------------|
| Daily Predictions | ✅ | ✅ | ✅ |
| Premium Content | ❌ | ✅ | ✅ |
| VIP Predictions | ❌ | ❌ | ✅ |
| Support | Email | Priority | 24/7 Phone |
| Referral Rate | 10% | 15% | 20% |

## 📈 Phase 1: Enhanced Predictions & Commission System

### New Features

**1. Categories System**
- Organized predictions by category (Football, Basketball, Tennis, etc.)
- Filter predictions by category slug
- Each prediction linked to a category

**2. Enhanced Prediction Model**
- **Fields Added:**
  - `categoryId`: Link to category
  - `league`: Tournament/league name
  - `homeTeam` & `awayTeam`: Match participants
  - `pick`: The actual prediction (e.g., "Liverpool to win")
  - `status`: UPCOMING, WON, LOST, VOID, EXPIRED
  - `resultNote`: Optional outcome description
  - `scheduledAt`: Match scheduled datetime
- **Removed:** Basic `sport`, `description`, `matchDate` replaced with more structured data

**3. Commission Tracking System**
- **CommissionLog Model:** Detailed logging of all commission payments
- **Tiered Commission Rates:**
  - First month payment: **50% commission** to referrer
  - Renewal payments: **20% commission** to referrer
- Automatic commission calculation on successful payments
- Monthly tracking with `YYYY-MM` format
- Links commissions to specific payments

**4. Enhanced Payment Model**
- Added `periodStart` and `periodEnd` for subscription periods
- Changed `method` to enum (stripe)
- Changed `amount` from Float to Decimal for precision
- Removed standalone `date` field (using `createdAt` instead)

**5. Statistics API**
- **Endpoint:** `GET /api/stats/predictions?period=2m`
- **Provides:**
  - Overall metrics (total picks, hit rate, average odds, ROI)
  - Monthly breakdown of predictions
  - Category-wise performance
  - Status distribution (won/lost/void/upcoming/expired)

**6. New API Endpoints**

```
# Predictions
GET    /api/predictions?category=slug&status=UPCOMING&from=&to=&page=&pageSize=
GET    /api/predictions/:id
POST   /api/predictions (admin)
PUT    /api/predictions/:id (admin)
DELETE /api/predictions/:id (admin)
POST   /api/predictions/maintenance/run (admin) - Auto-expire old predictions
GET    /api/predictions/categories/list

# Statistics
GET    /api/stats/predictions?period=2m

# Referrals
GET    /api/referrals/summary (authenticated)
GET    /api/referrals/logs (authenticated/admin)
```

### Database Schema Changes

**New Models:**
```prisma
model Category {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  predictions Prediction[]
}

model CommissionLog {
  id             String   @id @default(uuid())
  referrerId     String
  referredUserId String
  fromPaymentId  String
  amount         Decimal
  rateApplied    Decimal  // 0.5 for first month, 0.2 for renewals
  month          String   // YYYY-MM format
  createdAt      DateTime @default(now())
}
```

**Modified Models:**
- `Prediction`: Enhanced with category, league, teams, pick, status
- `Payment`: Added period tracking, enum for method
- `User`: Added commission log relations

### Migration

```bash
# Run the Phase 1 migration
cd packages/backend
DATABASE_URL="your-db-url" npx prisma migrate deploy

# Or in development
npm run db:migrate

# Seed sample data
npm run db:seed
```

### Webhook Integration

The Stripe webhook (`POST /api/stripe/webhook`) now:
1. Creates payment records with period information
2. Calculates commission based on payment history:
   - First payment from a referred user: 50% commission
   - Subsequent renewals: 20% commission
3. Creates CommissionLog entries for each commission
4. Updates Referral `earnedAmount` totals

### Testing Webhooks Locally

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/stripe/webhook

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger invoice.payment_succeeded
```

## 🚀 Deployment

### Backend Deployment
```bash
# Build production
npm run build --workspace=backend

# Start production server  
npm run start --workspace=backend
```

### Frontend Deployment  
```bash
# Build static export
npm run build --workspace=frontend

# Deploy to Vercel, Netlify, etc.
```

### Database Migration
```bash
# Production migration
DATABASE_URL="your-prod-db-url" npm run db:migrate --workspace=backend
```

## 🧪 Testing

```bash
# Run backend tests (if implemented)
npm test --workspace=backend

# Run frontend tests (if implemented)  
npm test --workspace=frontend
```

## 📊 Monitoring & Analytics

The platform includes built-in analytics for:
- User registration and growth
- Subscription metrics and revenue
- Referral performance  
- Payment processing status
- Prediction engagement

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS configuration
- Helmet.js security headers
- Environment variable protection

## 🆘 Troubleshooting

### Common Issues

**Database Connection:**
```bash
# Restart PostgreSQL
npm run docker:down
npm run docker:up
```

**Build Errors:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules packages/*/node_modules
npm install
```

**Stripe Webhooks:**
- Ensure webhook endpoint is accessible
- Verify webhook secret in environment
- Check Stripe CLI is running

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For questions or support:
- Create an issue in the repository
- Email: support@betwise.com (demo)
- Documentation: Check README sections above

---

**Built with ❤️ for the sports betting community**