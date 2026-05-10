import { describe, expect, test } from 'vitest'

// 模拟 parseChangelog 函数
const parseChangelog = (markdown: string) => {
  const lines = markdown.split('\n');
  const sections: { title: string; items: string[] }[] = [];
  let currentSection: { title: string; items: string[] } | null = null;

  for (const line of lines) {
    // 跳过版本标题行
    if (line.startsWith('## 🎉')) continue;
    
    // 检测章节标题（### 开头）
    if (line.startsWith('### ')) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: line.replace('### ', '').trim(),
        items: []
      };
    } 
    // 检测列表项（- 开头或** 开头）
    else if (currentSection && (line.trim().startsWith('-') || line.trim().startsWith('**'))) {
      let item = line.trim().replace(/^-\s*/, '');
      
      // 转换 markdown 粗体为 HTML
      item = item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      if (item) {
        currentSection.items.push(item);
      }
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
};

describe('Changelog Parser', () => {
  test('parses version changelog with sections and items', () => {
    const markdown = `## 🎉 v0.2.0 - 2026年5月10日

### ✨ 新功能

**🪟 Windows 用户的福音来啦！**
- PetBuddy 现在支持 Windows 10 和 Windows 11 啦！不管你是 32 位还是 64 位系统都能用
- Windows 用户也能在设置里看到自己的系统版本了（比如 Windows 11 专业版）

### 🔧 优化改进

**让安装更简单**
- Windows 安装程序现在更聪明了，会自动帮你创建 PetBuddy 文件夹
- 卸载的时候会保留你的设置和数据，重装也不怕丢失记录`;

    const result = parseChangelog(markdown);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('✨ 新功能');
    expect(result[0].items).toHaveLength(3); // 包含 ** 标题行
    expect(result[1].title).toBe('🔧 优化改进');
    expect(result[1].items).toHaveLength(3);
  });

  test('skips version title line', () => {
    const markdown = `## 🎉 v0.2.0 - 2026年5月10日

### ✨ 新功能

- 新增功能 A
- 新增功能 B`;

    const result = parseChangelog(markdown);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('✨ 新功能');
    expect(result[0].items).toEqual(['新增功能 A', '新增功能 B']);
  });

  test('handles empty sections', () => {
    const markdown = `## 🎉 v0.2.0

### ✨ 新功能

### 🔧 优化改进

- 优化项 A`;

    const result = parseChangelog(markdown);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('✨ 新功能');
    expect(result[0].items).toHaveLength(0);
    expect(result[1].title).toBe('🔧 优化改进');
    expect(result[1].items).toEqual(['优化项 A']);
  });

  test('handles markdown with bold markers', () => {
    const markdown = `### ✨ 新功能

**重要更新**
- 功能 A
- 功能 B`;

    const result = parseChangelog(markdown);

    expect(result).toHaveLength(1);
    expect(result[0].items).toContain('<strong>重要更新</strong>');
    expect(result[0].items).toContain('功能 A');
  });

  test('converts markdown bold to HTML strong tags', () => {
    const markdown = `### ✨ 新功能

- **粗体文本** 和普通文本
- 这是 **多个** **粗体** 的例子`;

    const result = parseChangelog(markdown);

    expect(result).toHaveLength(1);
    expect(result[0].items[0]).toBe('<strong>粗体文本</strong> 和普通文本');
    expect(result[0].items[1]).toBe('这是 <strong>多个</strong> <strong>粗体</strong> 的例子');
  });
});
