import {promises} from "fs";
import showdown from "showdown";

const argv = process.argv.slice(2);

function buildIndex(files: string[]): Map<string, string | null> {
    let result = new Map();
    for (let file of files) {
        const fileName = file.split("/").pop().replace(".md", "");
        if (result.has(fileName)) {
            result.set(fileName, null);
        } else {
            result.set(fileName, file.replace(".md", ""));
        }
    }
    return result;
}

function preprocess(text: string, index: Map<string, string | null>): string {
    const named_regex = /\[\[ *(.*?) *\| *(.*?) *\]\]/g;
    const named_replacement = (_: string, p1:string, p2: string) => `[${p2}](${p1.replace(/ /g, '%20')}.html)`;

    const regex = /\[\[ *(.*?) *\]\]/g;
    const replacement = (_: string, p1: string) => {
        if (index.get(p1)) return `[${p1}](/${index.get(p1).replace(/ /g, '%20')}.html)`;
        if (index.has(p1)) return `[${p1}](${p1.replace(/ /g, '%20')}.html)`;
        return p1;
    }

    return text.replace(regex, replacement).replace(named_regex, named_replacement);
}

async function convertToHTML(inDir: string, outDir: string): Promise<void> {
    let converter = new showdown.Converter();
    const files = (await promises.readdir(inDir, { recursive: true }))
        .filter((x: string) => x.endsWith(".md"));
    const index = buildIndex(files);
    
    for (let file of files) {
        const fileName = file.replace(".md", ".html");
        const text = await promises.readFile(`${inDir}/${file}`, {encoding: "utf-8"});
        const formattedText = preprocess(text, index);
        const html = converter.makeHtml(formattedText);
        
        const outPath = `${outDir}/${fileName}`;
        await promises.mkdir(outPath.split("/").slice(0, -1).join("/"), { recursive: true });
        await promises.writeFile(outPath, html);
    }
}

await convertToHTML(argv[0], argv[1]);
