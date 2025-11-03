# Planning Guide

Administrative system for managing Venezuelan animal lottery ("lotería de animalitos") operations, enabling complete control over lotteries, bets, prizes, financial pot management, user roles, and access permissions.

**Experience Qualities**:
1. **Professional** - Clean, organized interface that inspires confidence in managing financial transactions and user access
2. **Efficient** - Quick access to critical operations with search and filter capabilities
3. **Transparent** - Clear visualization of financial flows, winner calculations, and role-based permissions

**Complexity Level**: Complex Application (advanced functionality, accounts)
  - Multi-faceted lottery management system requiring state management, financial tracking, user bet monitoring, winner calculation, inter-pot transfers, role-based access control, and multi-user management with granular permissions.

## Essential Features

### Lottery CRUD Management with Time Schedules
- **Functionality**: Create, read, update, and delete lottery configurations with opening, closing, and draw times, plus prize structures
- **Purpose**: Define available lottery games with complete time management
- **Trigger**: Admin clicks "Nueva Lotería" button
- **Progression**: Form with lottery name, opening time, closing time, draw time, available animals/numbers → Save → Appears in lottery list with full schedule → Can edit all times or prizes → Search and filter by name, status, or schedule
- **Success criteria**: Lotteries persist with all three times, display correctly, and can be filtered/searched efficiently

### User & Role Management System
- **Functionality**: Create users and roles with granular module-level permissions, with mandatory passwords for administrative users
- **Purpose**: Control who has access to specific system functions with secure authentication
- **Trigger**: Admin navigates to Users or Roles tab
- **Progression**: Create role → Define permissions (dashboard, lotteries, bets, winners, history, users, roles) → Save → Create user → Assign name, email, and one or more roles → Set default password (required for admin roles, optional for others) → User can only access permitted modules → Edit or deactivate users as needed
- **Success criteria**: Users see only tabs they have permission for, multiple roles per user work correctly, system roles cannot be deleted, admin users require passwords, password validation on login works

### Login & Session Management
- **Functionality**: User selection screen with password authentication and session persistence
- **Purpose**: Identify current user, verify credentials, and apply their permissions
- **Trigger**: App loads without active session or user logs out
- **Progression**: Login screen → Select user from dropdown → Enter password if required → Session starts → User sees personalized header with name/email → Access restricted to permitted modules → Logout clears session
- **Success criteria**: Sessions persist across page refreshes, password validation works correctly, logout works, permissions apply immediately, default admin has password "admin123"

### Search & Filter Capabilities
- **Functionality**: Real-time search and multi-criteria filters for lotteries, bets, users, and roles
- **Purpose**: Quickly find specific records in large datasets
- **Trigger**: User types in search box or changes filter dropdown
- **Progression**: Enter search term → Results filter instantly → Select status/role filter → Combined filters apply → Clear to reset
- **Success criteria**: Search is case-insensitive, filters combine correctly, empty states show when no matches

### Bet Registration
- **Functionality**: Record user bets with lottery selection, amount, and chosen animals/numbers
- **Purpose**: Track all incoming bets and automatically allocate funds to pots
- **Trigger**: Admin creates ticket on behalf of user
- **Progression**: Select lottery → Choose animal/number → Enter bet amount → Auto-calculate pot distributions (70% prizes, 20% reserve, 10% profit) → Save bet → Update pot balances
- **Success criteria**: Bets are logged, pots update correctly, tickets have unique IDs

### Prize Draw & Winner Calculation
- **Functionality**: Enter winning number for a lottery and automatically calculate winners and payouts
- **Purpose**: Determine winners and distribute prizes from the 70% prize pot
- **Trigger**: Admin enters draw results for closed lottery
- **Progression**: Select lottery → Enter winning animal/number → System finds matching bets → Calculate payouts based on prize structure → Deduct from 70% pot → Display winners list
- **Success criteria**: Winners identified correctly, prize pot reduced by exact payout amount

### Pot Balance Management
- **Functionality**: View real-time balances of three pots (70% prizes, 20% reserve, 10% profit) and transfer between them
- **Purpose**: Maintain liquidity and manage business finances
- **Trigger**: Admin views dashboard or clicks pot management
- **Progression**: Dashboard shows three pot cards with balances → Click "Transferir" → Select source/destination pots → Enter amount → Confirm → Balances update
- **Success criteria**: Transfers are accurate, balances never go negative, audit trail maintained

### Profit Withdrawal
- **Functionality**: Withdraw funds from the 10% profit pot
- **Purpose**: Extract business earnings
- **Trigger**: Admin clicks "Retirar Ganancias" from profit pot
- **Progression**: View profit pot balance → Enter withdrawal amount → Confirm → Record withdrawal → Reduce pot balance
- **Success criteria**: Withdrawals logged with timestamps, profit pot balance decreases

## Edge Case Handling
- **No active lotteries**: Display empty state with prominent "Create First Lottery" button
- **Insufficient prize pot**: Warning when prize pot balance is low relative to potential payouts
- **Duplicate winning numbers**: Prevent entering results for same lottery twice
- **Negative transfer amounts**: Form validation prevents invalid transfers
- **Past closing times**: Visual indicator for closed lotteries, prevent new bets
- **Zero balances**: Disable withdrawal when profit pot is empty
- **Password authentication**: Incorrect password shows alert, empty password field prevents login when required, admin roles require passwords before user creation

## Design Direction

The design should feel professional and trustworthy like financial software, with clear visual hierarchy to distinguish critical financial data from operational controls. A minimal interface focused on data density and quick access to key metrics serves the operational nature better than decorative elements.

## Color Selection

Custom palette with financial application aesthetic - professional blues and greens to convey trust and money management.

- **Primary Color**: Deep Blue (oklch(0.45 0.15 250)) - Represents trust and stability for financial operations
- **Secondary Colors**: Neutral Gray (oklch(0.55 0.01 250)) for secondary actions and backgrounds
- **Accent Color**: Success Green (oklch(0.65 0.18 145)) for profit indicators and positive actions
- **Foreground/Background Pairings**: 
  - Background (Light Cream oklch(0.98 0.01 85)): Dark Blue foreground oklch(0.25 0.05 250) - Ratio 8.2:1 ✓
  - Card (White oklch(1 0 0)): Dark foreground oklch(0.20 0.02 250) - Ratio 14.5:1 ✓
  - Primary (Deep Blue oklch(0.45 0.15 250)): White text oklch(1 0 0) - Ratio 7.1:1 ✓
  - Accent (Success Green oklch(0.65 0.18 145)): Dark text oklch(0.20 0.05 145) - Ratio 11.3:1 ✓
  - Muted (Light Gray oklch(0.95 0.005 250)): Medium Gray text oklch(0.50 0.02 250) - Ratio 6.8:1 ✓

## Font Selection

Professional sans-serif typography that emphasizes clarity and readability for numbers and data tables, using Inter for its excellent legibility at all sizes and strong tabular figure support.

- **Typographic Hierarchy**: 
  - H1 (Dashboard Title): Inter SemiBold/32px/tight letter spacing/-0.02em
  - H2 (Section Headers): Inter SemiBold/24px/normal spacing
  - H3 (Card Titles): Inter Medium/18px/normal spacing
  - Body (Data): Inter Regular/15px/1.5 line height
  - Numbers (Balances): Inter SemiBold/20px/tabular-nums for alignment
  - Small (Labels): Inter Medium/13px/uppercase tracking-wide

## Animations

Subtle and functional animations that provide immediate feedback for financial operations without being distracting, emphasizing state changes for critical actions like transfers and withdrawals.

- **Purposeful Meaning**: Quick scale feedback on buttons, smooth transitions on pot balance updates, satisfying checkmark animation for successful operations
- **Hierarchy of Movement**: Priority on pot balance changes (fade+number count up), form submissions (scale down), tab switches (slide), minimal movement elsewhere

## Component Selection

- **Components**: 
  - `Card` for pot displays and lottery cards with subtle shadows
  - `Table` for bet history and winner lists with sticky headers
  - `Dialog` for lottery CRUD forms and transfer confirmations
  - `Form` with `Input`, `Select`, `Label` for all data entry
  - `Tabs` for switching between Lotteries/Bets/Winners/Pots views
  - `Badge` for lottery status (open/closed) and bet states
  - `Button` with variants (default for primary actions, outline for secondary, destructive for withdrawals)
  - `Alert` for low balance warnings
  - `ScrollArea` for long lists
  - `Separator` for visual grouping

- **Customizations**: 
  - Number display component with animated count-up for pot balances
  - Custom lottery time picker combining date-fns formatting
  - Pot transfer component with visual flow indicator
  - Venezuelan animals selector with icons/emojis (00-Delfín through 36-Cucaracha)

- **States**: 
  - Buttons: Hover with subtle lift, active with press down, disabled with reduced opacity
  - Inputs: Focus with blue ring, error with red border and shake animation
  - Cards: Hover elevation increase, selected state with border highlight

- **Icon Selection**: 
  - `Ticket` for bet creation
  - `Trophy` for winners
  - `CurrencyDollar` for profit pot
  - `ArrowsLeftRight` for transfers
  - `Calendar` for lottery scheduling
  - `ListBullets` for bet history
  - `Plus`/`Pencil`/`Trash` for CRUD operations

- **Spacing**: 
  - Container padding: p-6
  - Card internal: p-6
  - Form fields: space-y-4
  - Section gaps: gap-6
  - Tight groupings: gap-2

- **Mobile**: 
  - Stack pot cards vertically on mobile
  - Horizontal scroll for tables with sticky first column
  - Bottom sheet dialogs instead of center modals
  - Larger touch targets (min 44px) for critical actions
  - Simplified navigation with bottom tab bar
