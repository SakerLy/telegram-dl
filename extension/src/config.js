// Hằng số: kích thước chunk, retry, timeout, giới hạn bộ nhớ và danh sách.

const KB = 1024;
const MB = 1024 * 1024;

// 512KB: grid chunk của SW WebK và mức kẹp mỗi response 206 của SW WebA
const CHUNK_DEFAULT = 512 * KB;
const CHUNK_MAX = 1024 * KB; // = MAX_DOWNLOAD_FILE_PART_SIZE (tweb & gramjs)
const CHUNK_MIN = 256 * KB;

// WebA mediaLoader: 5 lần retry, backoff 250ms × 2^n
const CHUNK_RETRIES = 5;
const RETRY_BASE_MS = 250;
const RETRY_MAX_MS = 8000;

// SW WebA cho mỗi part chờ tới 60s
const STALL_TIMEOUT_MS = 60 * 1000;

// tối đa 2 task × 4 luồng × 1MB = 8MB đang tải cùng lúc, dưới mức 9MB dcBandwidthManager của WebA
const MAX_ACTIVE_TASKS = 2;

const WATCHDOG_MS = 120 * 1000; // ledger đứng yên quá lâu thì fail task, tránh treo vĩnh viễn

const TASK_AUTO_RETRY_MAX = 1;
const TASK_AUTO_RETRY_DELAY = 3000;

const BLOB_REGISTRY_MAX = 96;
const BLOB_REGISTRY_BYTES = 384 * MB;

const DOWNLOADED_CAP = 5000;
const FILE_LIST_SCAN_MAX = 5000; // shortcut: thư mục lưu lớn hơn chỉ quét 5000 file đầu, có thể sót file mới; nâng khi người dùng báo
const FILE_LIST_SHOW_MAX = 200;
const REFRESH_DELAY = 2000;
