const fs = require('fs');
const path = require('path');
const os = require('os');

const gradleCache = path.join(os.homedir(), '.gradle', 'caches');
const nodeModules = path.join(process.cwd(), 'node_modules', 'react-native');

function patchFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('std::format("{}%", dimension.value)')) {
        console.log(`Patching: ${filePath}`);
        content = content.replace('std::format("{}%", dimension.value)', 'std::to_string(dimension.value) + "%"');
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

function findAndPatch(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            findAndPatch(fullPath);
        } else if (file === 'graphicsConversions.h') {
            patchFile(fullPath);
        }
    }
}

console.log('--- Starting Patch Search ---');
console.log(`Scanning Node Modules: ${nodeModules}`);
findAndPatch(nodeModules);
console.log(`Scanning Gradle Cache: ${gradleCache}`);
findAndPatch(gradleCache);
console.log('--- Patching Complete ---');
