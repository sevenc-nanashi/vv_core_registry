import Prism from "@uiw/react-prismjs";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import exampleClang from "./examples/c.c?raw";
import exampleHttp from "./examples/http.bash?raw";
import examplePython from "./examples/python.py?raw";
import exampleJava from "./examples/java.java?raw";
import exampleKotlin from "./examples/kotlin.kt?raw";
import "prismjs/components/prism-python";
import "prismjs/components/prism-c";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-java";
import "prismjs/components/prism-kotlin";
import "react-tabs/style/react-tabs.css";
import { useState } from "react";

const docuemntUrls = [
  "https://voicevox.github.io/voicevox_engine/api/",
  "https://voicevox.github.io/voicevox_core/apis/c_api/",
  "https://voicevox.github.io/voicevox_core/apis/python_api/",
  "https://voicevox.github.io/voicevox_core/apis/java_api/",
  "https://voicevox.github.io/voicevox_core/apis/java_api/",
];

function App() {
  const [tabIndex, setTabIndex] = useState(0);
  return (
    <>
      <header className="bg-primary p-4 text-xl font-bold text-white">
        VOICEVOX for Developers
      </header>
      <main className="flex-grow p-4 flex flex-col mx-auto gap-2 w-[1024px]">
        VOICEVOXの合成音声部分は様々な言語から利用することができます。
        <Tabs onSelect={(index) => setTabIndex(index)}>
          <TabList>
            <Tab>HTTP</Tab>
            <Tab>C</Tab>
            <Tab>Python</Tab>
            <Tab>Java</Tab>
            <Tab>Kotlin</Tab>
          </TabList>

          <TabPanel>
            <Prism language="bash" source={exampleHttp} />
          </TabPanel>
          <TabPanel>
            <Prism language="c" source={exampleClang} />
          </TabPanel>
          <TabPanel>
            <Prism language="python" source={examplePython} />
          </TabPanel>
          <TabPanel>
            <Prism language="java" source={exampleJava} />
          </TabPanel>
          <TabPanel>
            <Prism language="kotlin" source={exampleKotlin} />
          </TabPanel>
        </Tabs>
        <a
          href={docuemntUrls[tabIndex]}
          className="block text-center bg-primary text-white text-xl rounded mx-auto px-8 py-4 shadow-sm hover:shadow-md focus:shadow-md transition-shadow duration-300"
        >
          ドキュメントをチェック
        </a>
      </main>
    </>
  );
}

export default App;
