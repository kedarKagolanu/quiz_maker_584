# QuizCLI - Terminal-Style Quiz Application

A React-based quiz application with a terminal-inspired interface, featuring browser storage for all data persistence.

## Features

✅ **User Management**
- Signup/Login with username/password
- User history and statistics
- Multiple user support

✅ **Quiz Creation**
- JSON-based question format
- Support for LaTeX equations
- Customizable settings:
  - Public/Private visibility
  - Quiz time limits
  - Per-question time limits
  - Randomize question order

✅ **Quiz Taking**
- Terminal-style interface
- Real-time timer display
- Question-by-question navigation
- LaTeX equation rendering

✅ **Results & Analytics**
- Detailed score breakdown
- Time analysis per question
- Total quiz time tracking
- Performance history

✅ **Leaderboard**
- Per-quiz leaderboards
- Sorted by score and time
- Public quiz rankings

## JSON Format

The quiz questions use a compact JSON format:

```json
[
  {
    "q": "Question text here",
    "o": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "a": 2
  }
]
```

### JSON Field Reference

- `q`: Question text (string)
- `o`: Array of options (string[])
- `a`: Correct answer index, 0-based (number)
- `t`: Time limit in seconds (optional, number)
- `l`: Has LaTeX equations (optional, boolean)

### Example with All Features

```json
[
  {
    "q": "What is the capital of France?",
    "o": ["London", "Berlin", "Paris", "Rome"],
    "a": 2
  },
  {
    "q": "Solve: 5 + 3 × 2",
    "o": ["10", "11", "16", "13"],
    "a": 1,
    "t": 15
  },
  {
    "q": "What is $\\sqrt{16}$?",
    "o": ["2", "4", "8", "16"],
    "a": 1,
    "l": true
  }
]
```

## Project Structure

```
src/
├── types/
│   └── quiz.ts              # TypeScript interfaces
├── lib/
│   ├── storage.ts           # localStorage utilities
│   └── utils.ts             # Helper functions
├── contexts/
│   └── AuthContext.tsx      # Authentication context
├── components/
│   └── Terminal.tsx         # Terminal UI components
├── pages/
│   ├── Auth.tsx             # Login/Signup
│   ├── Dashboard.tsx        # User dashboard
│   ├── QuizCreator.tsx      # Create quiz
│   ├── QuizTaker.tsx        # Take quiz
│   ├── Results.tsx          # Quiz results
│   ├── Leaderboard.tsx      # Quiz leaderboard
│   └── MyQuizzes.tsx        # User's quizzes
└── App.tsx                  # Main app with routing
```

## How to Use

### 1. Create an Account
- Navigate to the home page
- Click "create account"
- Enter username and password

### 2. Create a Quiz
- From dashboard, click "create quiz"
- Enter quiz title
- Paste your questions in JSON format (see example above)
- Configure settings:
  - Make public/private
  - Set time limits
  - Enable randomization
- Click "create quiz"

### 3. Take a Quiz
- From dashboard, browse available quizzes
- Click "start" on any quiz
- Answer questions within time limits (if set)
- Review your results

### 4. View Results
- After completing a quiz, view detailed breakdown
- See time spent per question
- Check correct/incorrect answers
- Compare with leaderboard

## Data Storage

All data is stored in browser localStorage:
- **Users**: Username, password, created date
- **Quizzes**: All quiz data and settings
- **Attempts**: Quiz results and performance data

⚠️ **Note**: Data is stored locally in your browser. Clearing browser data will delete all quizzes and results.

## Design

The application uses a terminal/CLI-inspired design with:
- Monospace font
- Green terminal accent color
- Dark background
- Command-line aesthetic
- Responsive layout

## Future Enhancements

Potential features for future development:
- CSV import for questions
- Export quiz results
- Quiz templates
- Question bank management
- Rich text editor for questions
- Image support in questions
- Backend integration for cloud storage
- Social sharing features
