# ==============================================================================
#  PowerShell Script to Recreate Project Structure from Video
# ==============================================================================

# Set the name for the root project folder
$ProjectName = "QuizApp-Project"

# Check if the project directory already exists to prevent overwriting
if (Test-Path -Path $ProjectName) {
    Write-Host "Error: Directory '$ProjectName' already exists in the current location." -ForegroundColor Red
    Write-Host "Please remove it or run this script in a different location." -ForegroundColor Yellow
    exit
}

# --- Script Execution Starts ---
Write-Host "Creating project structure for '$ProjectName'..." -ForegroundColor Cyan

# Create the root project directory and navigate into it
New-Item -ItemType Directory -Name $ProjectName | Out-Null
Set-Location -Path $ProjectName

# --- Create top-level directories ---
$directories = @(
    "public",
    "src",
    "src/components",
    "src/components/ui",
    "src/contexts",
    "src/hooks",
    "src/lib",
    "src/pages",
    "src/types"
)
foreach ($dir in $directories) {
    New-Item -ItemType Directory -Path $dir | Out-Null
}
Write-Host "-> Created all directories."

# --- Create all files ---
$files = @(
    # Root
    ".gitignore", "components.json", "eslint.config.js", "index.html", "package.json", "postcss.config.js",
    "README.md", "tailwind.config.ts", "tsconfig.app.json", "tsconfig.json", "tsconfig.node.json", "vite-env.d.ts",
    # public
    "public/example-quiz.json", "public/favicon.ico", "public/placeholder.svg", "public/robots.txt",
    # src
    "src/App.css", "src/App.tsx", "src/index.css", "src/main.tsx",
    # src/components/ui
    "src/components/ui/accordion.tsx", "src/components/ui/alert-dialog.tsx", "src/components/ui/alert.tsx",
    "src/components/ui/aspect-ratio.tsx", "src/components/ui/avatar.tsx", "src/components/ui/badge.tsx",
    "src/components/ui/breadcrumb.tsx", "src/components/ui/button.tsx", "src/components/ui/calendar.tsx",
    "src/components/ui/card.tsx", "src/components/ui/carousel.tsx", "src/components/ui/chart.tsx",
    "src/components/ui/checkbox.tsx", "src/components/ui/collapsible.tsx", "src/components/ui/command.tsx",
    "src/components/ui/context-menu.tsx", "src/components/ui/dialog.tsx", "src/components/ui/drawer.tsx",
    "src/components/ui/dropdown-menu.tsx", "src/components/ui/form.tsx", "src/components/ui/hover-card.tsx",
    "src/components/ui/input-otp.tsx", "src/components/ui/input.tsx", "src/components/ui/label.tsx",
    "src/components/ui/LatexRenderer.tsx", "src/components/ui/menubar.tsx", "src/components/ui/navigation-menu.tsx",
    "src/components/ui/pagination.tsx", "src/components/ui/popover.tsx", "src/components/ui/progress.tsx",
    "src/components/ui/radio-group.tsx", "src/components/ui/resizable.tsx", "src/components/ui/scroll-area.tsx",
    "src/components/ui/select.tsx", "src/components/ui/separator.tsx", "src/components/ui/sheet.tsx",
    "src/components/ui/skeleton.tsx", "src/components/ui/slider.tsx", "src/components/ui/sonner.tsx",
    "src/components/ui/switch.tsx", "src/components/ui/table.tsx", "src/components/ui/tabs.tsx",
    "src/components/ui/Terminal.tsx", "src/components/ui/textarea.tsx", "src/components/ui/toast.tsx",
    "src/components/ui/toaster.tsx", "src/components/ui/toggle-group.tsx", "src/components/ui/toggle.tsx",
    "src/components/ui/tooltip.tsx", "src/components/ui/use-toast.ts",
    # src/contexts
    "src/contexts/AuthContext.tsx",
    # src/hooks
    "src/hooks/use-mobile.tsx", "src/hooks/use-toast.ts",
    # src/lib
    "src/lib/storage.ts", "src/lib/utils.ts",
    # src/pages
    "src/pages/Auth.tsx", "src/pages/Dashboard.tsx", "src/pages/index.tsx", "src/pages/Leaderboard.tsx",
    "src/pages/MyQuizzes.tsx", "src/pages/NotFound.tsx", "src/pages/QuizCreator.tsx", "src/pages/QuizTaker.tsx",
    "src/pages/Results.tsx",
    # src/types
    "src/types/quiz.ts"
)
foreach ($file in $files) {
    New-Item -ItemType File -Path $file | Out-Null
}
Write-Host "-> Created all empty files."

# --- Final message ---
Write-Host "`nProject structure for '$ProjectName' created successfully!" -ForegroundColor Green

# Optional: Return to the parent directory
Set-Location -Path ".."