"use client"

import React from "react"
import { useWebContainer } from "@/components/atoms/webcontainer"
import { CodeMirror } from "./codemirror";

export const files = {
  'index.js': {
    file: {
      contents: `
import express from 'express';
const app = express();
const port = 3111;

app.get('/', (req, res) => {
  res.send('Welcome to a WebContainers app! 🥳');
});

app.listen(port, () => {
  console.log(\`App is live at http://localhost:\${port}\`);
});`,
    },
  },
  'package.json': {
    file: {
      contents: `{
  "name": "example-app",
  "type": "module",
  "dependencies": {
    "express": "latest",
    "nodemon": "latest"
  },
  "scripts": {
    "start": "nodemon --watch './' index.js"
  }
}`,
    },
  },
};

export const TestWebContainer: React.FC = () => {
  const [value, setValue] = React.useState("")
  const webContainer = useWebContainer()

  React.useEffect(() => {
    if (webContainer !== null) {
      webContainer.mount(files)
      webContainer.fs.readFile('package.json', 'utf-8').then((value) => {
        setValue(value)
      })
    }
  }, [webContainer])

  return <CodeMirror height="400px" value={value} onChange={(value) => webContainer?.fs.writeFile("package.json", value)}/>
}