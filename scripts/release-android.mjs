import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- 配置区域 ---
const NEW_VERSION = process.argv[2];
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 修正点1: 针对 aarch64 架构的输出路径
const APK_OUTPUT_DIR = path.join(PROJECT_ROOT, 'src-tauri/gen/android/app/build/outputs/apk/arm64-v8a/release');
// 修正点2: Gradle 生成的文件名通常带架构标识
const GENERATED_APK_NAME = 'app-arm64-v8a-release.apk'; 

const TARGET_RELEASE_DIR = path.join(PROJECT_ROOT, 'release');
const TARGET_APK_NAME = 'android_arm.apk'; // GitHub Release 最终发布的文件名

// --- 检查输入 ---
if (!NEW_VERSION) {
  console.error('❌ 请提供版本号，例如: npm run release:android 0.1.3');
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
  json.version = version; // v2 可能是 json.package.version 或直接 json.version
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
    console.log('🔨 开始构建 Android APK (加速模式: 仅构建 arm64)...');
    
    // 修正点3: 显式指定 --apk true，可以指定架构以加速编译
    // run('npx tauri android build --apk true --target aarch64'); 
    run('npx tauri android build --apk true'); 

    // 3. 寻找并移动 APK
    console.log('📦 处理构建产物...');
    
    if (!fs.existsSync(TARGET_RELEASE_DIR)) {
      fs.mkdirSync(TARGET_RELEASE_DIR);
    }

    const sourceApk = path.join(APK_OUTPUT_DIR, GENERATED_APK_NAME);
    
    if (!fs.existsSync(sourceApk)) {
      // 如果找不到，尝试查找 universal 路径（以防万一 CLI 行为差异）
      const fallbackPath = path.join(PROJECT_ROOT, 'src-tauri/gen/android/app/build/outputs/apk/release/app-release.apk');
      if (fs.existsSync(fallbackPath)) {
        console.log('⚠️ 未找到 arm64 包，但找到了通用包，将使用通用包。');
        fs.copyFileSync(fallbackPath, path.join(TARGET_RELEASE_DIR, TARGET_APK_NAME));
      } else {
        throw new Error(`找不到构建好的 APK 文件。\n预期路径: ${sourceApk}\n请检查 build 输出日志。`);
      }
    } else {
      const destApk = path.join(TARGET_RELEASE_DIR, TARGET_APK_NAME);
      fs.copyFileSync(sourceApk, destApk);
      console.log(`✅ APK 已复制到: ${destApk}`);
    }

    // 4. Git 操作
    console.log('git 提交与推送...');
    // 强制添加 release 文件夹，即使它被 gitignore 忽略
    run(`git add -f release/${TARGET_APK_NAME}`);
    run(`git add package.json src-tauri/tauri.conf.json`);
    
    run(`git commit -m "chore: release v${NEW_VERSION}"`);
    run(`git tag v${NEW_VERSION}`);
    
    console.log('📤 推送到远程仓库...');
    run(`git push origin main`); // 确保这里是你的主分支名 (main 或 master)
    run(`git push origin v${NEW_VERSION}`);

    console.log(`\n🎉 发布流程完成！请前往 GitHub Actions 查看发布进度。`);

  } catch (error) {
    console.error('\n❌ 发布失败:', error.message);
    process.exit(1);
  }
})();