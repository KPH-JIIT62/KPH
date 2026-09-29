const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, paint) {
  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const row = y * stride;
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = paint(x, y);
      const i = row + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function waScreenshot() {
  const colors = [
    [232, 236, 244],
    [79, 140, 255],
    [232, 236, 244],
    [210, 153, 34],
    [232, 236, 244],
    [248, 81, 73],
    [143, 181, 160],
  ];
  const lengths = [92, 150, 70, 188, 120, 210, 64];
  return encodePng(420, 168, (x, y) => {
    if (y < 26) return x < 8 ? [248, 81, 73] : [22, 26, 34];
    const line = Math.floor((y - 34) / 16);
    if (line >= 0 && line < lengths.length && y % 16 < 8 && x > 18 && x < 18 + lengths[line]) {
      return colors[line];
    }
    return [16, 19, 24];
  });
}

function buildPdf(lines) {
  const safe = (line) => line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  let ops = "BT /F1 11 Tf\n";
  let y = 750;
  for (const line of lines) {
    ops += `1 0 0 1 48 ${y} Tm (${safe(line)}) Tj\n`;
    y -= 16;
    if (y < 48) break;
  }
  ops += "ET";
  const objects = [
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n",
    "2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n",
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n",
    `4 0 obj<</Length ${Buffer.byteLength(ops)}>>stream\n${ops}\nendstream\nendobj\n`,
    "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(body));
    body += object;
  }
  const xrefAt = Buffer.byteLength(body);
  let xref = "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++) xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  const trailer = `trailer<</Size 6/Root 1 0 R>>\nstartxref\n${xrefAt}\n%%EOF`;
  return Buffer.from(body + xref + trailer, "binary");
}

function buildZip(filename, content) {
  const data = Buffer.from(content);
  const name = Buffer.from(filename);
  const crc = crc32(data);
  const local = Buffer.alloc(30 + name.length);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0, 8);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(name.length, 26);
  name.copy(local, 30);
  const file = Buffer.concat([local, data]);

  const central = Buffer.alloc(46 + name.length);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE(0, 42);
  name.copy(central, 46);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(central.length, 12);
  eocd.writeUInt32LE(file.length, 16);
  return Buffer.concat([file, central, eocd]);
}

const CPP_SOLUTION = `#include <bits/stdc++.h>
using namespace std;

// CF 1901C Add, Divide and Floor
// Only min and max matter. x = min % 2 pulls both ends together.
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int t;
    cin >> t;
    while (t--) {
        int n;
        cin >> n;
        vector<int> a(n);
        for (int &x : a) cin >> x;
        int mn = *min_element(a.begin(), a.end());
        int mx = *max_element(a.begin(), a.end());
        vector<int> ops;
        while (mn != mx) {
            int x = mn % 2;
            ops.push_back(x);
            mn = (mn + x) / 2;
            mx = (mx + x) / 2;
        }
        cout << ops.size() << "\\n";
        if ((int)ops.size() <= n) {
            for (int x : ops) cout << x << " ";
            cout << "\\n";
        }
    }
}
`;

function ensureAssets(uploadsDir) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  const files = {
    "cp-handbook.pdf": buildPdf([
      "Coding Hub  -  CP Handbook",
      "Rahul Sharma",
      "",
      "Complexity to remember before you code",
      "n <= 1e5     O(n log n) is the usual ceiling",
      "n <= 2e5     avoid maps of maps on the hot path",
      "n <= 20      subset DP / meet in the middle",
      "n <= 500     O(n^3) DP can pass if the constant is small",
      "",
      "Before submitting",
      "1. Print the sample exactly, including blank lines.",
      "2. Check n = 1 and the all-equal case.",
      "3. Name the invariant in one sentence.",
    ]),
    "dp-cheatsheet.pdf": buildPdf([
      "Dynamic Programming Cheatsheet",
      "Arjun Mehta",
      "",
      "State first, transition second, base case last.",
      "If the state remembers an index and a last choice,",
      "write the recurrence before opening the editor.",
      "",
      "LIS length: tails array + binary search, O(n log n).",
      "Knapsack: roll one dimension if you only need the answer.",
      "Digit DP: tight, leading-zero, and the prefix number.",
    ]),
    "binary-search-cheatsheet.pdf": buildPdf([
      "Binary Search Cheatsheet",
      "Priya Singh",
      "",
      "Binary search on answer, not on the array.",
      "The check must be monotone. If it is not, stop.",
      "",
      "low = smallest value that might work",
      "high = largest value that might work",
      "mid = low + (high - low) / 2",
      "",
      "Prefer a half-open range if the off-by-one keeps coming back.",
      "For integer problems, test the boundary where check flips.",
    ]),
    "wa-pretest2.png": waScreenshot(),
    "greedy-1901c.cpp": Buffer.from(CPP_SOLUTION),
    "icpc-practice-set.zip": buildZip(
      "week-4.txt",
      [
        "ICPC practice set  -  week of Sep 29",
        "One laptop. Two hours. Freeze at 100 minutes.",
        "",
        "1. Greedy / constructive   (easy-medium)",
        "2. Graph shortest path    (medium)",
        "3. DP on a sequence       (medium)",
        "",
        "No discussion until the virtual freeze.",
        "Editorials go in #problem-discussion.",
      ].join("\n")
    ),
  };

  for (const [name, data] of Object.entries(files)) {
    fs.writeFileSync(path.join(uploadsDir, name), data);
  }
  return files;
}

function fileSize(uploadsDir, name) {
  return fs.statSync(path.join(uploadsDir, name)).size;
}

module.exports = { crc32, ensureAssets, fileSize, buildPdf, buildZip, encodePng };
