# Gamification System

DiaryBeast's gamification system encourages consistent journaling through an engaging virtual pet mechanic, streak tracking, and token rewards.

## 🎮 Core Mechanics

### Pet Life System

**How It Works**:
- Users start with **7 lives** for their virtual pet
- **24-hour grace period**: No penalty for the first 24 hours of inactivity
- **Life loss**: 1 life lost per 24 hours after grace period
- **Life restoration**: Writing an entry restores **+2 lives** (capped at 7)

**Pet States**:
- **Happy** (4-7 lives): Pet is healthy and happy
- **Sad** (1-3 lives): Pet needs attention
- **Critical** (0 lives): Pet has lost all lives (streak resets)

**Visual Feedback**:
- 💚 **Claimed Life**: Life restored by writing today
- ❤️ **Available Life**: Lives you have but haven't claimed today
- 🖤 **Lost Life**: Lives lost due to inactivity

### Streak System

**How It Works**:
- **Streak tracking**: Consecutive days of journaling
- **Milestone bonuses**: Bonus tokens at specific intervals
- **Streak reset**: Resets to 1 if a day is missed or pet loses all lives

**Milestone Rewards**:
- **3 days**: +5 tokens
- **7 days**: +20 tokens
- **14 days**: +50 tokens
- **30 days**: +100 tokens
- **60 days**: +250 tokens
- **90 days**: +500 tokens
- **180 days**: +1000 tokens
- **365 days**: +5000 tokens

**Note**: Bonus tokens are multiplied by the reward multiplier based on pet condition (happiness and lives).

**Multiplier System**:
- Base reward: 10 tokens per entry
- Reward multiplier: Based on pet condition (happiness and lives)
  - **1.0x** (Perfect): Happiness ≥ 70% and Lives ≥ 5
  - **0.8x** (Good): Happiness ≥ 50% and Lives ≥ 3
  - **0.5x** (Poor): Happiness < 50% OR Lives < 3
  - **0.25x** (Critical): Lives ≤ 1 (overrides happiness)
- Streak bonus: Bonus tokens at milestones (multiplied by reward multiplier)
- Total reward: (Base × Multiplier) + (Streak bonus × Multiplier)

**Example**:
- Perfect condition (happiness=80%, lives=6): 10 × 1.0 = 10 tokens base
- Poor condition (happiness=45%, lives=5): 10 × 0.5 = 5 tokens base
- Critical condition (happiness=90%, lives=1): 10 × 0.25 = 2.5 tokens base

### Token Rewards

**Base Rewards**:
- **Entry creation**: 10 tokens (base amount)
- **Word count bonus**: Additional tokens for longer entries
- **Streak bonus**: Multiplier based on current streak

**Reward Calculation**:
```
Base Reward = 10 tokens
Streak Multiplier = Based on milestone (1x to 20x)
Streak Bonus = Milestone bonus (50 to 50000 tokens)
Total = (Base × Multiplier) + Streak Bonus
```

### Shop System

**Items Available**:
- **Food Items**: Restore lives and happiness
  - Basic Kibble: +1 life, 5 tokens
  - Premium Meat: +1 life, +10 happiness, 20 tokens
  - Veggie Bowl: +1 life, +20 happiness, 15 tokens
  - Energy Drink: +2 lives, +30 happiness, 50 tokens

- **Consumable Items**: Special effects
  - Time Skip Potion: Reset cooldowns, 100 tokens
  - Health Potion: Restore 3 lives, 150 tokens
  - Happy Pill: Boost happiness +30, 50 tokens

- **Customization Items**:
  - Backgrounds: Customize pet environment
  - Accessories: Decorate your pet

**Soul-Bound Items**:
- All items are **soul-bound** (non-transferable)
- Items remain in user's inventory permanently
- Cannot be sold or transferred to other users

## 🎯 Engagement Features

### Daily Timer

**Purpose**: Visual reminder to write daily
- Shows time remaining in current day
- Highlights if entry has been written today
- Encourages consistent journaling

### Streak Calendar

**Purpose**: Visual progress tracking
- Shows last 7 days of journaling
- Highlights consecutive days (streaks)
- Shows missed days

### Pet Personality

**Features**:
- **Energy Level**: Hyper, Normal, Calm
- **Favorite Food**: Meat, Veggies, Kibble
- **Sleep Schedule**: Day, Night, Anytime

**Impact**:
- Affects pet behavior and animations
- Personalized experience per user
- Generated based on wallet address

### Happiness System

**How It Works**:
- **Starting happiness**: 100/100
- **Decay over time**: -1% happiness every 2 hours of inactivity
- **Restoration**: Writing entries, feeding pet, using items
- **Impact**: Affects reward multiplier (higher happiness = higher multiplier)
- **Penalty threshold**: Below 50% happiness reduces reward multiplier to 0.5x

## 📊 Gamification Metrics

### User Stats Tracked

- **Current Streak**: Consecutive days of journaling
- **Longest Streak**: Best streak achieved
- **Total Entries**: Total number of entries written
- **Tokens Earned**: Total tokens earned
- **Lives Remaining**: Current pet health
- **Happiness**: Current pet happiness level

### Visual Feedback

- **Pet Animations**: Different animations based on state
- **Confetti Celebrations**: Milestone achievements
- **Progress Bars**: Visual progress indicators
- **Notifications**: Life loss and milestone alerts

## 🏆 Achievement System

### Milestones

- **First Entry**: Welcome reward
- **3 Day Streak**: Bronze milestone
- **7 Day Streak**: Silver milestone
- **14 Day Streak**: Gold milestone
- **30 Day Streak**: Platinum milestone
- **100 Day Streak**: Diamond milestone
- **365 Day Streak**: Legendary milestone

### Rewards

- **Token Bonuses**: Milestone bonuses (5 to 5000 tokens, multiplied by reward multiplier)
- **Multipliers**: Reward multipliers based on pet condition (happiness and lives)
- **Visual Celebrations**: Confetti and animations
- **Badges**: Achievement badges (future feature)

## 🎮 Game Mechanics

### Life System Flow

```
User writes entry
    ↓
Restore +2 lives (capped at 7)
    ↓
Reset inactivity timer
    ↓
Update pet state (happy/sad/critical)
```

### Streak System Flow

```
User writes entry
    ↓
Check if consecutive day
    ↓
Update streak counter
    ↓
Check for milestone
    ↓
Apply multiplier and bonus
    ↓
Mint tokens to user
```

### Reward System Flow

```
Entry created
    ↓
Calculate base reward (10 tokens)
    ↓
Apply streak multiplier
    ↓
Add streak bonus (if milestone)
    ↓
Mint tokens to user
    ↓
Update user stats
```

## 🔧 Technical Implementation

### Key Files

- `lib/gamification/lifeSystem.ts` - Life system logic
- `lib/gamification/streakRewards.ts` - Streak and reward calculations
- `lib/gamification/itemsConfig.ts` - Shop items configuration
- `components/Pet.tsx` - Pet display component
- `components/StreakCalendar.tsx` - Streak calendar display
- `components/DailyTimer.tsx` - Daily timer component
- `components/GamificationModal.tsx` - Gamification info modal

### Database Schema

**User Model**:
- `livesRemaining`: Current pet lives (0-7)
- `currentStreak`: Current streak count
- `longestStreak`: Longest streak achieved
- `happiness`: Current happiness level (0-100)
- `petState`: Pet emotional state (happy/sad/critical)
- `petPersonality`: Pet personality traits (JSON)
- `inventory`: User's items (JSON)
- `lastActiveAt`: Last activity timestamp
- `lastLifeLossCheck`: Last life loss check timestamp

### API Endpoints

- `POST /api/entries` - Create entry (triggers rewards)
- `POST /api/pet/feed` - Feed pet (restore lives/happiness)
- `POST /api/pet/use-item` - Use item from inventory
- `GET /api/shop/items` - Get available shop items
- `POST /api/shop/purchase` - Purchase item (burn tokens)

## 🎯 Benefits

### For Users

- **Motivation**: Visual feedback encourages consistency
- **Rewards**: Token incentives for journaling
- **Engagement**: Pet system creates emotional connection
- **Progress**: Visual tracking of achievements

### For Engagement

- **Daily Activity**: Life system encourages daily writing
- **Long-term Commitment**: Streak system rewards consistency
- **Retention**: Pet system creates emotional investment
- **Community**: Achievement system fosters competition (future)

## 🚀 Future Enhancements

### Planned Features

- **Pet Evolution**: Pets evolve based on journaling patterns
- **Rare Collectibles**: NFT collectibles for milestones
- **Social Features**: Share achievements with friends
- **Leaderboards**: Global and friend leaderboards
- **Challenges**: Weekly and monthly challenges
- **Pet Customization**: More customization options

## 📚 Resources

- [Life System Implementation](../lib/gamification/lifeSystem.ts)
- [Streak Rewards Logic](../lib/gamification/streakRewards.ts)
- [Items Configuration](../lib/gamification/itemsConfig.ts)
- [Pet Component](../components/Pet.tsx)

