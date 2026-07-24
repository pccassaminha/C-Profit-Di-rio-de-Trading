import fs from 'fs';

let content = fs.readFileSync('src/components/Planner.tsx', 'utf8');

if (!content.includes("import Modal")) {
  content = content.replace(
    "import { DateRangePicker } from './DateRangePicker';",
    "import { DateRangePicker } from './DateRangePicker';\nimport Modal from './Modal';"
  );
  fs.writeFileSync('src/components/Planner.tsx', content);
  console.log("Fixed Modal import in Planner.tsx");
}

