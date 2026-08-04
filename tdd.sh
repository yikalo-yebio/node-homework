if [ $# -gt 0 ]; then
    npx jest --setupFiles ./jest.setup.js --runTestsByPath "tdd/$1.test.js" --detectOpenHandles
else
    npx jest --setupFiles ./jest.setup.js --detectOpenHandles
fi
