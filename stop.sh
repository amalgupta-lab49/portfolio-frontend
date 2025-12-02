#!/bin/bash

# Stop React development server
echo "Stopping React development server..."

# Kill process on port 3000
if lsof -ti:3000 > /dev/null 2>&1; then
    lsof -ti:3000 | xargs kill -9
    echo "✓ Stopped process on port 3000"
else
    echo "  No process found on port 3000"
fi

# Kill any react-scripts processes
if pgrep -f "react-scripts start" > /dev/null 2>&1; then
    pkill -f "react-scripts start"
    echo "✓ Stopped react-scripts processes"
else
    echo "  No react-scripts processes found"
fi

echo "Done!"

