// scripts/release-android.mjs
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- 配置区域 ---
const NEW_VERSION = process.argv[2]; // 从命令行获取版本号
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APK_OUTPUT_DIR = path.join(PROJECT_ROOT, 'src-tauri/gen/android/app/build/outputs/apk/universal/release');
// 如果你没有构建 universal 包，可能是这个路径，请根据实际情况调整：
// const APK_OUTPUT_DIR = path.join(PROJECT_ROOT, 'src-tauri/gen/android/app/build/outputs/apk/arm64-v8a/release');

const TARGET_RELEASE_DIR = path.join(PROJECT_ROOT, 'release');
const TARGET_APK_NAME = 'android_arm.apk'; // 必须和 GitHub Action 里的名字一致

// --- 检查输入 ---
if (!NEW_VERSION) {
  console.error('❌ 请提供版本号，例如: node scripts/release-android.mjs 0.1.3');
  process.exit(1);
}

// --- 工具函数 ---
function run(command) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: 'inherit', cwd: PROJECT_ROOT });
}

function updateJsonVersion(filePath, version) {
  const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  json.version = version;
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
}

function updateTauriConf(filePath, version) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const json = JSON.parse(content);
  json.version = version;
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
}

(async () => {
  try {
    console.log(`🚀 开始准备发布 Android 版本: v${NEW_VERSION}`);

    // 1. 修改版本号
    console.log('📝 更新版本号...');
    updateJsonVersion(path.join(PROJECT_ROOT, 'package.json'), NEW_VERSION);
    updateTauriConf(path.join(PROJECT_ROOT, 'src-tauri/tauri.conf.json'), NEW_VERSION);

    // 2. 构建 Android APK
    console.log('🔨 开始构建 Android APK (这可能需要几分钟)...');
    // 使用 --apk 确保生成 apk，--target aarch64 针对真机 (如果你想生成通用包去掉 target 参数)
    // 注意：第一次为了稳妥，我们生成 universal 包 (包含所有架构)，或者你可以指定 aarch64
    // 这里演示构建 universal 包，兼容性最好
    run('npx tauri android build --apk'); 

    // 3. 寻找并移动 APK
    console.log('📦 处理构建产物...');
    
    // 确保 release 目录存在
    if (!fs.existsSync(TARGET_RELEASE_DIR)) {
      fs.mkdirSync(TARGET_RELEASE_DIR);
    }

    // 查找生成的 APK
    // 注意：Tauri 构建后的文件名通常叫 app-universal-release.apk
    const sourceApk = path.join(APK_OUTPUT_DIR, 'app-universal-release.apk');
    
    if (!fs.existsSync(sourceApk)) {
      throw new Error(`找不到构建好的 APK 文件: ${sourceApk}\n请检查 src-tauri/gen/android/app/build/outputs/apk 下的实际生成路径`);
    }

    const destApk = path.join(TARGET_RELEASE_DIR, TARGET_APK_NAME);
    fs.copyFileSync(sourceApk, destApk);
    console.log(`✅ APK 已复制到: ${destApk}`);

    // 4. Git 操作
    console.log('git 提交与推送...');
    run(`git add package.json src-tauri/tauri.conf.json release/${TARGET_APK_NAME}`);
    run(`git commit -m "chore: release v${NEW_VERSION}"`);
    run(`git tag v${NEW_VERSION}`);
    run(`git push origin main`); // 假设你的主分支叫 main
    run(`git push origin v${NEW_VERSION}`);

    console.log(`\n🎉 发布流程完成！GitHub Action 应该已经开始工作了。`);
    console.log(`👉 查看进度: https://github.com/Kozmosa/LingoVault/actions`);

  } catch (error) {
    console.error('\n❌ 发布失败:', error.message);
    process.exit(1);
  }
})();