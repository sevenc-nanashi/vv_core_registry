import Prism from "@uiw/react-prismjs";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import exampleTts from "./examples/tts.py?raw";
import exampleRequirements from "./examples/requirements.txt?raw";
import examplePoetry from "./examples/poetry.toml?raw";
import "prismjs/components/prism-python";
import "prismjs/components/prism-toml";
import "prismjs/components/prism-bash";
import "react-tabs/style/react-tabs.css";

const version = "0.14.3";

function App() {
  return (
    <>
      <header className="bg-primary p-4 text-xl font-bold text-white">
        VOICEVOX Core wrapper for Python
      </header>
      <main className="flex-grow p-4 flex flex-col mx-auto gap-2 w-[1024px]">
        voicevox_core ライブラリは Python のバインディングを提供しています。
        <Prism language="python" source={exampleTts} />
        <h2 className="text-2xl font-bold">インストール</h2>
        <Tabs>
          <TabList>
            <Tab>pip</Tab>
            <Tab>requirements.txt</Tab>
            <Tab>Poetry</Tab>
          </TabList>

          <TabPanel>
            <Prism
              language="bash"
              source={`pip install --extra-index-url https://voicevox.github.io/voicevox_core/ voicevox_core==${version}`}
            />
          </TabPanel>
          <TabPanel>
            <Prism
              language="txt"
              source={exampleRequirements.replace("!{version}", version)}
            />
          </TabPanel>
          <TabPanel>
            <Prism
              language="toml"
              source={examplePoetry.replace("!{version}", version)}
            />
          </TabPanel>
        </Tabs>
        <a
          href="https://voicevox.github.io/voicevox_core/apis/python_api/"
          className="block text-center bg-primary text-white text-xl rounded mx-auto px-8 py-4 shadow-sm hover:shadow-md focus:shadow-md transition-shadow duration-300"
        >
          ドキュメントをチェック
        </a>
      </main>
    </>
  );
}

export default App;
