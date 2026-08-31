// State Management
let filesList = [];
let nextId = 1;
let isProcessed = false;
let partyData = [];
const appsScriptUrl = "https://script.google.com/macros/s/AKfycbwFfXErcIfmCvx8gEecvCFHVdiwIJPE1tSRkOjjU1b69i8JMUnfpRwGYXxvZHKk4Q8n/exec";
let editingPartyCode = null;
let uploadedZipBaseName = ""; // Tracks the original uploaded ZIP file name for download naming

// Folder Create state variables
let fldUploadedFiles = [];
let fldGeneratedZipBlob = null;
let fldGeneratedZipName = "";
let fldMode = 'files'; // 'files' or 'folders'

// Invoice Error state variables
let invUploadedFiles = [];
let invGeneratedZipBlob = null;
let invGeneratedZipName = "";

let trackerSyncStatus = 'offline'; // 'online' (Google Sheets) or 'offline' (LocalStorage)

// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const folderInput = document.getElementById('folder-input');
const btnSelectFiles = document.getElementById('btn-select-files');
const btnSelectFolder = document.getElementById('btn-select-folder');
const emptyState = document.getElementById('empty-state');
const tableContainer = document.getElementById('table-container');
const filesTbody = document.getElementById('files-tbody');
const searchInput = document.getElementById('search-input');
const btnClear = document.getElementById('btn-clear');
const btnDownloadZip = document.getElementById('btn-download-zip');
const btnProcessAction = document.getElementById('btn-process-action');
const dashboardControls = document.getElementById('dashboard-controls');
const toggleStructure = document.getElementById('toggle-structure');
const structureLabel = document.getElementById('structure-label');
const toastElement = document.getElementById('toast');
const inlineProgress = document.getElementById('inline-progress');
const loadingText = document.getElementById('loading-text');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressPercent = document.getElementById('progress-percent');

// File Mapping Elements
const mappingCard = document.getElementById('mapping-card');
const mappingCardTitle = document.getElementById('mapping-card-title');
const mappingBodySingle = document.getElementById('mapping-body-single');
const mappingBodyBatch = document.getElementById('mapping-body-batch');
const batchDetectedText = document.getElementById('batch-detected-text');
const selectOdFile = document.getElementById('select-od-file');
const selectDtFile = document.getElementById('select-dt-file');
const selectSummaryFile = document.getElementById('select-summary-file');

// Custom Naming & Range & Console Elements
const inputOdName = document.getElementById('input-od-name');
const inputDtName = document.getElementById('input-dt-name');
const inputCombinedName = document.getElementById('input-combined-name');
const rangeValue = document.getElementById('range-value');
const btnCopyRange = document.getElementById('btn-copy-range');
const consoleLogs = document.getElementById('console-logs');

// Details Log Elements
const logTdFilename = document.getElementById('log-td-filename');
const logTdRange = document.getElementById('log-td-range');
const logTdDates = document.getElementById('log-td-dates');
const logTdB2p2 = document.getElementById('log-td-b2p2');
const btnCopyLog = document.getElementById('btn-copy-log');

// DT Cancelled Log Elements
const cancelledInvoicesList = document.getElementById('cancelled-invoices-list');
const btnCopyCancelled = document.getElementById('btn-copy-cancelled');

// Sheet Inspector Modal Elements
const inspectorModal = document.getElementById('inspector-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const inspectorTable = document.getElementById('inspector-table');
const inspectorThead = document.getElementById('inspector-thead');
const inspectorTbody = document.getElementById('inspector-tbody');
const modalTitle = document.getElementById('modal-title');

// Stats Elements
const statTotal = document.getElementById('stat-total');
const statOd = document.getElementById('stat-od');
const statDt = document.getElementById('stat-dt');
const statDtSold = document.getElementById('stat-dt-sold');
const statDtCancelled = document.getElementById('stat-dt-cancelled');
const statUnmatched = document.getElementById('stat-unmatched');

// Database Sync Elements
const btnRefreshDb = document.getElementById('btn-refresh-db');
const dbStatusDot = document.getElementById('db-status-dot');
const dbStatusText = document.getElementById('db-status-text');
const dbSearchInput = document.getElementById('db-search-input');
const dbCountTag = document.getElementById('db-count-tag');
const dbTbody = document.getElementById('db-tbody');
const formAddParty = document.getElementById('form-add-party');
const addPartyCodeInput = document.getElementById('add-party-code');
const addPartyNameInput = document.getElementById('add-party-name');

// Initialize Events
document.addEventListener('DOMContentLoaded', () => {
    setupEventHandlers();
    setupDeleteConfirmationModal();
    loadPartyData();
    setupSeparateFile();
    setupRenameFile();
    setupMergeFile();
    setupMyntraError();
    setupLossError();
    setupFolderCreate();
    setupInvoiceError();
    setupErrorTracker();
    setupCleanAndResetButtons();
});


function setupEventHandlers() {
    // Select Files/ZIP Trigger
    btnSelectFiles.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        handleUploadedFiles(e.target.files);
    });

    // Select Folder Trigger
    btnSelectFolder.addEventListener('click', (e) => {
        e.stopPropagation();
        folderInput.click();
    });

    folderInput.addEventListener('change', (e) => {
        handleUploadedFiles(e.target.files);
    });

    // Drag and Drop Zone events
    dropzone.addEventListener('click', (e) => {
        if (e.target.closest('#btn-select-folder') || e.target.closest('#btn-select-files')) {
            return;
        }
        fileInput.click();
    });

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleUploadedFiles(e.dataTransfer.files);
        }
    });

    // Process Files Trigger
    btnProcessAction.addEventListener('click', processUploadedFiles);

    // Search Input
    searchInput.addEventListener('input', () => {
        renderFilesTable();
    });

    // Settings Toggle
    toggleStructure.addEventListener('change', (e) => {
        structureLabel.textContent = e.target.checked 
            ? "Keep Original Folder Paths" 
            : "Flatten All Files (No folders)";
        showToast("Zip download preference updated!", "success");
    });

    // Copy Range Button
    btnCopyRange.addEventListener('click', () => {
        const rangeText = rangeValue.textContent;
        if (rangeText && rangeText !== "—" && rangeText !== "Range generate nahi ho paya") {
            navigator.clipboard.writeText(rangeText).then(() => {
                showToast("Invoice Range copied!", "success");
            }).catch(err => {
                showToast("Failed to copy range", "error");
            });
        }
    });

    // Copy Log Button
    btnCopyLog.addEventListener('click', () => {
        const filename = logTdFilename.textContent;
        const range = logTdRange.textContent;
        const dates = logTdDates.textContent;
        const b2p2 = logTdB2p2.textContent;
        
        if (filename && filename !== "—") {
            // Excel Details Table format row: FileName, InvoiceRange, DateRange, Empty, Empty, B2/P2
            const tsvRow = `${filename}\t${range}\t${dates}\t\t\t${b2p2}`;
            navigator.clipboard.writeText(tsvRow).then(() => {
                showToast("Log Row copied for Excel pasting!", "success");
            }).catch(err => {
                showToast("Failed to copy log row", "error");
            });
        } else {
            showToast("No log details available yet.", "error");
        }
    });

    // Copy Cancelled Invoices Button
    btnCopyCancelled.addEventListener('click', () => {
        const badges = cancelledInvoicesList.querySelectorAll('.cancelled-invoice-badge');
        if (badges.length > 0) {
            const invoices = Array.from(badges).map(b => b.textContent);
            const copyText = invoices.join('\n');
            navigator.clipboard.writeText(copyText).then(() => {
                showToast("Cancelled Invoices list copied!", "success");
            }).catch(err => {
                showToast("Failed to copy list", "error");
            });
        } else {
            showToast("No cancelled invoices to copy.", "error");
        }
    });

    // Modal Close handlers
    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => {
            if (inspectorModal) {
                inspectorModal.classList.remove('show');
                inspectorModal.classList.add('hidden');
            }
        });
    }

    if (inspectorModal) {
        inspectorModal.addEventListener('click', (e) => {
            if (e.target === inspectorModal) {
                inspectorModal.classList.remove('show');
                inspectorModal.classList.add('hidden');
            }
        });
    }

    // Reset All
    btnClear.addEventListener('click', resetState);

    // Download Zip
    btnDownloadZip.addEventListener('click', downloadAllAsZip);

    // Tab switcher handlers
    const tabButtons = document.querySelectorAll('.tab-btn[data-tab]');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetElement = document.getElementById(targetTab);
            if (targetElement) {
                targetElement.classList.add('active');
            }
            
            if (targetTab === 'tab-database' && appsScriptUrl) {
                loadPartyData();
            }
            if (targetTab === 'tab-error-tracker') {
                renderErrorTracker();
            }
        });
    });

    // Refresh Database Event
    btnRefreshDb.addEventListener('click', () => {
        if (!appsScriptUrl) {
            showToast("No API URL connected.", "error");
            return;
        }
        loadPartyData();
    });

    // Database search input
    dbSearchInput.addEventListener('input', () => {
        renderPartyTable();
    });

    // Add Party Record form submit
    formAddParty.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = addPartyCodeInput.value.trim();
        const name = addPartyNameInput.value.trim();
        
        if (!code || !name) {
            showToast("Please enter both Code and Party Name.", "error");
            return;
        }
        
        await addPartyRecord(code, name);
    });
}

// Show Toast Notification
function showToast(message, type = "success") {
    toastElement.textContent = message;
    toastElement.className = "toast show";
    if (type === "error") {
        toastElement.classList.add('toast-error');
    } else if (type === "success") {
        toastElement.classList.add('toast-success');
    }
    setTimeout(() => {
        toastElement.classList.remove('show');
    }, 3000);
}

// Helper to generate dynamic timestamped summary filename
function getSummaryTimestampFilename() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const day = pad(now.getDate());
    const month = pad(now.getMonth() + 1);
    const year = now.getFullYear();
    const hours = pad(now.getHours());
    const mins = pad(now.getMinutes());
    const secs = pad(now.getSeconds());
    return `myntra invoice summary ${day}-${month}-${year} ${hours}-${mins}-${secs}.xlsx`;
}

// Show/Hide Inline Progress Bar (no overlay)
let currentProgress = 0;

function showLoading(text, percent) {
    loadingText.textContent = text || "Processing files...";
    currentProgress = percent || 0;
    progressBarFill.style.width = currentProgress + '%';
    progressPercent.textContent = currentProgress + '%';
    inlineProgress.classList.remove('hidden');
}

function updateProgress(percent, text) {
    currentProgress = Math.min(Math.round(percent), 100);
    progressBarFill.style.width = currentProgress + '%';
    progressPercent.textContent = currentProgress + '%';
    if (text) loadingText.textContent = text;
}

function hideLoading() {
    // Animate to 100% before hiding
    updateProgress(100, "Done!");
    setTimeout(() => {
        inlineProgress.classList.add('hidden');
        // Reset for next use
        progressBarFill.style.width = '0%';
        progressPercent.textContent = '0%';
        currentProgress = 0;
    }, 600);
}

// Console Logging
function clearLogs() {
    consoleLogs.innerHTML = '';
}

function addLog(message, type = "info") {
    const div = document.createElement('div');
    div.className = `log-line ${type}`;
    let color = "#9aa0b9";
    if (type === "success") color = "#10b981";
    if (type === "error") color = "#ef4444";
    if (type === "warning") color = "#f59e0b";
    
    div.style.color = color;
    div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    consoleLogs.appendChild(div);
    consoleLogs.scrollTop = consoleLogs.scrollHeight;
}

// Reset State
function resetState() {
    filesList = [];
    nextId = 1;
    isProcessed = false;
    fileInput.value = '';
    folderInput.value = '';
    searchInput.value = '';
    inputOdName.value = 'OD_Processed';
    inputDtName.value = 'DT_Processed';
    inputCombinedName.value = 'Combined_Output';
    
    emptyState.classList.remove('hidden');
    tableContainer.classList.add('hidden');
    dashboardControls.classList.add('hidden');
    btnProcessAction.classList.add('hidden');
    mappingCard.classList.add('hidden');
    
    rangeValue.textContent = "—";
    logTdFilename.textContent = "—";
    logTdRange.textContent = "—";
    logTdDates.textContent = "—";
    logTdB2p2.textContent = "—";
    
    cancelledInvoicesList.innerHTML = '<span class="text-muted" style="color: var(--text-muted);">None logged yet...</span>';
    
    clearLogs();
    addLog("Ready to run pipeline...", "info");
    
    updateStats();
    showToast("Cleared all files.", "success");
}

// File Processing Logic
async function handleUploadedFiles(files) {
    if (files.length === 0) return;
    
    showLoading("Reading files...", 5);
    let newFilesAdded = 0;
    let zipFound = false;

    try {
        // Clear previous state if already processed
        if (isProcessed) {
            filesList = [];
            nextId = 1;
            isProcessed = false;
            rangeValue.textContent = "—";
            logTdFilename.textContent = "—";
            logTdRange.textContent = "—";
            logTdDates.textContent = "—";
            logTdB2p2.textContent = "—";
            cancelledInvoicesList.innerHTML = '<span class="text-muted" style="color: var(--text-muted);">None logged yet...</span>';
            clearLogs();
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Check if file is a ZIP
            if (file.name.toLowerCase().endsWith('.zip')) {
                zipFound = true;
                // Store the uploaded ZIP base name (without extension) for download naming
                const dotIdx = file.name.lastIndexOf('.');
                uploadedZipBaseName = dotIdx !== -1 ? file.name.substring(0, dotIdx) : file.name;
                showLoading(`Extracting ZIP: ${file.name}...`, 10);
                await processZipFile(file);
                updateProgress(80, "Classifying extracted files...");
            } else {
                processSingleFile(file);
                newFilesAdded++;
            }
        }
        
        hideLoading();
        if (filesList.length > 0) {
            emptyState.classList.add('hidden');
            tableContainer.classList.remove('hidden');
            
            // Show the Process action button and mapping selectors
            btnProcessAction.classList.remove('hidden');
            mappingCard.classList.remove('hidden');
            dashboardControls.classList.add('hidden');
            
            populateSelectors();
            renderFilesTable();
            
            if (zipFound) {
                showToast("ZIP files loaded. Confirm mapping & click Process.", "success");
                addLog("ZIP files extracted. Mappings auto-assigned.", "warning");
            } else {
                showToast(`${filesList.length} files loaded. Confirm mapping & click Process.`, "success");
                addLog(`${filesList.length} files loaded. Mappings auto-assigned.`, "info");
            }
        } else {
            showToast("No valid files found inside uploaded content.", "error");
        }
    } catch (error) {
        console.error(error);
        hideLoading();
        showToast("Error processing files: " + error.message, "error");
    }
}

// Extract files from ZIP in browser
async function processZipFile(zipFile) {
    const zip = await JSZip.loadAsync(zipFile);
    const promises = [];
    
    // Extract digits from zip filename (e.g. "139.zip" -> "139", "INDO_139_PR.zip" -> "139")
    const zipName = zipFile.name;
    const zipDigitsMatch = zipName.match(/\d+/);
    const zipDigits = zipDigitsMatch ? zipDigitsMatch[0] : null;
    const zipBaseName = zipName.substring(0, zipName.lastIndexOf('.')) || zipName;
    
    zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
            const ext = getFileExtension(zipEntry.name);
            const lowerExt = ext.toLowerCase();
            if (lowerExt !== 'xlsx' && lowerExt !== 'xls' && lowerExt !== 'csv') {
                return; // ignore non-excel/non-csv system files
            }
            const promise = zipEntry.async("blob").then((blob) => {
                const filename = zipEntry.name.split('/').pop();
                
                // Check if relativePath already contains a numeric folder prefix
                let adjustedPath = relativePath;
                const pathParts = relativePath.split('/');
                let hasNumericFolder = false;
                for (let i = 0; i < pathParts.length - 1; i++) {
                    if (/^\d+/.test(pathParts[i])) {
                        hasNumericFolder = true;
                        break;
                    }
                }
                
                if (!hasNumericFolder) {
                    // Prepend folder prefix based on zip digits or zip base name
                    const prefix = zipDigits || zipBaseName;
                    adjustedPath = `${prefix}/${relativePath}`;
                }
                
                const fileObj = createFileObject(filename, adjustedPath, ext, blob);
                filesList.push(fileObj);
            });
            promises.push(promise);
        }
    });
    
    await Promise.all(promises);
}

// Process single file
function processSingleFile(file) {
    const relativePath = file.webkitRelativePath || file.name;
    const ext = getFileExtension(file.name);
    const lowerExt = ext.toLowerCase();
    if (lowerExt !== 'xlsx' && lowerExt !== 'xls' && lowerExt !== 'csv') {
        return; // ignore non-excel/non-csv system files
    }
    const fileObj = createFileObject(file.name, relativePath, ext, file);
    filesList.push(fileObj);
}

// Helper to determine extension
function getFileExtension(filename) {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop() : '';
}

// Create internal file object structure and apply initial auto-mapping categorization
function createFileObject(name, path, ext, fileBlob) {
    let category = 'unmatched';
    let renamedName = name;
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('dropship') || lowerName.includes('seller_orders_report')) {
        category = 'OD';
        renamedName = ext ? `OD.${ext}` : 'OD';
    } else if (lowerName.includes('taxsales') || lowerName.includes('tax')) {
        category = 'DT';
        renamedName = ext ? `DT.${ext}` : 'DT';
    } else if (lowerName.includes('summary') || lowerName.includes('arrange') || lowerName.includes('brand') || lowerName.includes('central') || lowerName.includes('party') || lowerName.includes('database')) {
        category = 'Summary';
    }

    return {
        id: nextId++,
        name: name,
        path: path,
        ext: ext,
        originalFile: fileBlob,
        category: category,
        renamedName: renamedName
    };
}

// Scan filesList and return list of unique party codes (excluding generated/cancellation sheets)
function getUniquePartyCodes() {
    const codes = new Set();
    filesList.forEach(file => {
        // Exclude processed Combined sheets and other dynamic files we generate
        if (file.category === "Combined" || file.name.endsWith("-PARTLY CANCEL ORDER.xlsx") || file.name.endsWith("-GST NOT APPLICABLE.xlsx") || file.name.endsWith("-2 MORE INVOICE.xlsx") || file.name.endsWith("-SUMMARY.xlsx") || file.name === "PARTLY CANCEL ORDER.xlsx" || file.name === "GST NOT APPLICABLE.xlsx" || file.name === "2 MORE INVOICE.xlsx" || file.name === "SUMMARY.xlsx") {
            return;
        }
        const code = getPartyCode(file);
        if (code && code !== "PartyCode") {
            codes.add(code);
        }
    });
    return Array.from(codes);
}

// Populate file mapping dropdown lists
function populateSelectors() {
    const uniqueCodes = getUniquePartyCodes();
    
    if (uniqueCodes.length > 1) {
        // Batch Mode: Hide single dropdowns, show batch info message
        mappingCardTitle.textContent = "Batch File Mappings";
        mappingBodySingle.classList.add('hidden');
        mappingBodyBatch.classList.remove('hidden');
        batchDetectedText.innerHTML = `Detected <strong>${uniqueCodes.length}</strong> unique party codes: <span style="color: white; font-weight: 600;">${uniqueCodes.join(', ')}</span>`;
        return;
    }
    
    // Single Mode: Show dropdowns, hide batch info message
    mappingCardTitle.textContent = "Confirm File Mapping";
    mappingBodySingle.classList.remove('hidden');
    mappingBodyBatch.classList.add('hidden');
    
    selectOdFile.innerHTML = '<option value="">-- Choose OD File --</option>';
    selectDtFile.innerHTML = '<option value="">-- Choose DT File --</option>';
    selectSummaryFile.innerHTML = '<option value="">-- Choose Sale Summary File --</option>';
    
    filesList.forEach(file => {
        const displayPath = file.path.length > 50 ? '...' + file.path.slice(-47) : file.path;
        const optionHTML = `<option value="${file.id}">${displayPath}</option>`;
        selectOdFile.insertAdjacentHTML('beforeend', optionHTML);
        selectDtFile.insertAdjacentHTML('beforeend', optionHTML);
        selectSummaryFile.insertAdjacentHTML('beforeend', optionHTML);
    });
    
    // Auto-assignment
    const odFile = filesList.find(f => f.category === 'OD');
    const dtFile = filesList.find(f => f.category === 'DT');
    const summaryFile = filesList.find(f => f.category === 'Summary') || filesList.find(f => f.category === 'unmatched');
    
    if (odFile) selectOdFile.value = odFile.id;
    if (dtFile) selectDtFile.value = dtFile.id;
    if (summaryFile) selectSummaryFile.value = summaryFile.id;
}

// Parse Excel or CSV to AOA (Array of Arrays)
function readExcelAsAOA(fileBlob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {
                    type: 'array',
                    cellDates: true,
                    raw: false,
                    defval: ""
                });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const aoa = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
                resolve(aoa);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(fileBlob);
    });
}

// Excel date text formatting function matching VBA: =TEXT(RC9,"DD-MM-YYYY HH:MM:SS.000")
function formatDate(val) {
    if (val === undefined || val === null || val === "") return "";
    let date;
    
    if (val instanceof Date) {
        date = val;
    } else {
        const str = String(val).trim();
        if (!str) return "";
        
        // Handle Excel Date serial numbers
        if (!isNaN(Number(str))) {
            date = new Date((Number(str) - 25569) * 86400000);
        } else {
            date = new Date(str);
        }
    }
    
    if (isNaN(date.getTime())) {
        return String(val).trim();
    }
    
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    
    return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}.000`;
}

// Parse formatted Date string back to Date object
function parseFormattedDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.trim().split(' ');
    if (parts.length < 1) return null;
    const dateParts = parts[0].split('-');
    if (dateParts.length !== 3) return null;
    
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const year = parseInt(dateParts[2], 10);
    
    let hour = 0, min = 0, sec = 0;
    if (parts[1]) {
        const timeParts = parts[1].split(':');
        hour = parseInt(timeParts[0], 10) || 0;
        min = parseInt(timeParts[1], 10) || 0;
        if (timeParts[2]) {
            sec = parseInt(timeParts[2].split('.')[0], 10) || 0;
        }
    }
    
    const d = new Date(year, month, day, hour, min, sec);
    return isNaN(d.getTime()) ? null : d;
}

// Clean non-printable characters (ASCII < 32) and trim
function cleanCell(val) {
    if (val === undefined || val === null) return "";
    return String(val).replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim();
}

// Custom Key Cleaning mapping function (VBA CleanKey Translation)
function cleanKey(v) {
    if (v === undefined || v === null) return "";
    let k = String(v);
    
    // Replace backticks, single quotes, non-breaking space (160), tab, vbCr, vbLf
    k = k.replace(/[`'\x7F-\x9F\x00-\x1F\x80-\x9F\xA0\t\r\n]/g, "");
    k = k.trim();
    
    // Format numeric string to rounded flat integer
    if (k !== "" && !isNaN(Number(k))) {
        k = String(Math.round(Number(k)));
    }
    
    return k;
}

// Extract party code (e.g. 139) from selected OD file path or filename
function getPartyCode(odFileObj) {
    if (!odFileObj) return "PartyCode";
    
    // 1. Try path folders first (if path has subfolders, handling both / and \)
    if (odFileObj.path && (odFileObj.path.includes('/') || odFileObj.path.includes('\\'))) {
        const parts = odFileObj.path.split(/[\/\\]/);
        // Loop from right to left (deepest folder to root folder)
        for (let i = parts.length - 2; i >= 0; i--) {
            // First check if folder segment starts with digits
            const match = parts[i].match(/^\d+/);
            if (match) return match[0];
            
            // Check if folder segment contains known party code digits
            const allDigitMatches = parts[i].match(/\d+/g);
            if (allDigitMatches) {
                for (const num of allDigitMatches) {
                    const exists = partyData.some(item => String(item.code).trim() === num.trim());
                    if (exists) return num;
                }
            }
        }
    }
    
    // 2. Try file name starting digits
    if (odFileObj.name) {
        const match = odFileObj.name.match(/^\d+/);
        if (match) return match[0];
        
        // Check if file name contains known party code digits
        const allDigitMatches = odFileObj.name.match(/\d+/g);
        if (allDigitMatches) {
            for (const num of allDigitMatches) {
                const exists = partyData.some(item => String(item.code).trim() === num.trim());
                if (exists) return num;
            }
        }
    }
    
    // 3. Fallback: Check if path or file name contains known party names (case-insensitive & bracket-aware)
    const combinedPathName = `${odFileObj.path || ''} ${odFileObj.name || ''}`;
    const normSearchStr = combinedPathName.toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (normSearchStr !== "") {
        for (let i = 0; i < partyData.length; i++) {
            const item = partyData[i];
            if (!item || !item.code) continue;

            const itemCode = String(item.code).trim();
            const fullPartyCode = String(item.partyCode || "").trim();

            // Extract bracket names
            const bracketMatches = [];
            const bracketRegex = /\(([^)]+)\)/g;
            let match;
            while ((match = bracketRegex.exec(fullPartyCode)) !== null) {
                if (match[1]) bracketMatches.push(match[1].trim());
            }

            for (const b of bracketMatches) {
                const normB = b.toUpperCase().replace(/[^A-Z0-9]/g, "");
                if (normB.length >= 3 && normSearchStr.indexOf(normB) !== -1) {
                    return itemCode;
                }
            }

            // Main name without code prefix and without brackets
            const mainNameStr = fullPartyCode.replace(/\([^)]*\)/g, "").replace(/^\d+[\s\-_.]*/, "").trim();
            const normMain = mainNameStr.toUpperCase().replace(/[^A-Z0-9]/g, "");
            if (normMain.length >= 3 && normSearchStr.indexOf(normMain) !== -1) {
                return itemCode;
            }
        }
    }

    return "PartyCode";
}

// Retrieve full party code name from local database cache (or build custom fallback)
function getPartyCodeName(partyCode) {
    if (!partyCode) return "PartyCode";
    const codeClean = String(partyCode).trim();

    // 1. Direct code match in partyData
    let found = partyData.find(item => item && String(item.code).trim() === codeClean);

    // 2. Starts-with match in partyData (e.g. item.partyCode starts with "217-" or "217 ")
    if (!found) {
        found = partyData.find(item => item && item.partyCode && (
            String(item.partyCode).trim().startsWith(`${codeClean}-`) ||
            String(item.partyCode).trim().startsWith(`${codeClean} `) ||
            String(item.partyCode).trim().startsWith(`${codeClean}_`)
        ));
    }

    // 3. Substring match in partyData
    if (!found) {
        found = partyData.find(item => item && item.partyCode && String(item.partyCode).includes(codeClean));
    }

    if (found && found.partyCode) {
        return found.partyCode;
    }

    // 4. If not in database, check uploaded files path/filename for folder name (e.g. "217-VENDOR NAME")
    if (typeof filesList !== "undefined" && filesList.length > 0) {
        const partyFiles = filesList.filter(f => getPartyCode(f) === codeClean || f.partyCode === codeClean);
        for (const f of partyFiles) {
            // Check folder path segments
            if (f.path && (f.path.includes('/') || f.path.includes('\\'))) {
                const parts = f.path.split(/[\/\\]/);
                for (let i = parts.length - 2; i >= 0; i--) {
                    const segment = parts[i].trim();
                    if (segment.startsWith(codeClean) && /[a-zA-Z]/.test(segment)) {
                        return segment;
                    }
                }
            }
            // Check filename
            if (f.name) {
                const baseName = f.name.substring(0, f.name.lastIndexOf('.')) || f.name;
                if (baseName.startsWith(codeClean) && /[a-zA-Z]/.test(baseName)) {
                    const parts = baseName.split('-');
                    if (parts.length >= 2) {
                        return `${parts[0]}-${parts[1]}`;
                    }
                    return baseName;
                }
            }
        }
    }

    // 5. Fallback: If codeClean already contains letters, return it; otherwise return codeClean
    if (/[a-zA-Z]/.test(codeClean)) {
        return codeClean;
    }
    return codeClean;
}

// Main Advanced Content Join & Process Logic (VBA 1 to 8 + Final Combined Join)
// Core pipeline processing logic for a single party group
async function processPartyPipeline(odFileObj, dtFileObj, summaryFileObj, partyCode, isBatchMode = false) {
    addLog(`--- Processing Party Code: ${partyCode} ---`, "warning");
    
    // Step 1: Read sheet data
    addLog(`[${partyCode}] Loading sheet contents in background...`, "info");
    const odRows = await readExcelAsAOA(odFileObj.originalFile);
    addLog(`[${partyCode}] Loaded OD Sheet: ${odRows.length} rows.`, "success");
    
    const dtRows = await readExcelAsAOA(dtFileObj.originalFile);
    addLog(`[${partyCode}] Loaded DT Sheet: ${dtRows.length} rows.`, "success");
    
    const summaryRows = await readExcelAsAOA(summaryFileObj.originalFile);
    addLog(`[${partyCode}] Loaded Sale Summary Sheet: ${summaryRows.length} rows.`, "success");
    
    // Step 2: Format dates in Column I and restrict columns strictly to A:AU (cols 0-46)
    addLog(`[${partyCode}] Formatting OD dates (Column I)...`, "info");
    const processedOdRows = [];
    for (let r = 0; r < odRows.length; r++) {
        const row = odRows[r] || [];
        const paddedRow = new Array(47).fill("");
        for (let c = 0; c < Math.min(row.length, 47); c++) {
            paddedRow[c] = row[c];
        }
        
        if (r >= 1 && paddedRow[8] !== "") {
            paddedRow[8] = formatDate(paddedRow[8]);
        }
        processedOdRows.push(paddedRow);
    }
    
    // Step 3: Load Sale Summary Column B into Set
    addLog(`[${partyCode}] Creating dictionary from Sale Summary (Column B)...`, "info");
    const summarySet = new Set();
    for (let r = 2; r < summaryRows.length; r++) {
        const val = summaryRows[r][1]; // Column B (Index 1)
        const cleanVal = cleanCell(val).toLowerCase();
        if (cleanVal !== "") {
            summarySet.add(cleanVal);
        }
    }
    addLog(`[${partyCode}] Sale Summary Dictionary loaded with ${summarySet.size} unique keys.`, "success");
    
    // Step 4: Delete matched OD rows based on Column H (Index 7) matching Summary Set
    addLog(`[${partyCode}] Filtering OD File: Deleting matching rows against Sale Summary...`, "info");
    const filteredOdRows = [processedOdRows[0]]; // retain header
    let odDeletedCount = 0;
    for (let r = 1; r < processedOdRows.length; r++) {
        const row = processedOdRows[r];
        const key = cleanCell(row[7]).toLowerCase();
        
        if (summarySet.has(key)) {
            odDeletedCount++;
        } else {
            filteredOdRows.push(row);
        }
    }
    addLog(`[${partyCode}] OD Filtering Done: Deleted ${odDeletedCount} rows. Remaining: ${filteredOdRows.length - 1} rows.`, "success");
    
    // Step 5: Read Log Details (Date Range & B2/P2) before splitting partly cancelled rows
    addLog(`[${partyCode}] Calculating date range (Column I)...`, "info");
    let minDate = null;
    let maxDate = null;
    for (let r = 1; r < filteredOdRows.length; r++) {
        const row = filteredOdRows[r];
        if (row && row[8]) {
            const parsed = parseFormattedDate(row[8]);
            if (parsed) {
                if (!minDate || parsed < minDate) minDate = parsed;
                if (!maxDate || parsed > maxDate) maxDate = parsed;
            }
        }
    }
    
    let dateRangeStr = "—";
    if (minDate && maxDate) {
        const padZero = (n) => String(n).padStart(2, '0');
        const formatShortDate = (d) => `${padZero(d.getDate())}-${padZero(d.getMonth()+1)}-${d.getFullYear()}`;
        dateRangeStr = `${formatShortDate(minDate)} TO ${formatShortDate(maxDate)}`;
    }
    addLog(`[${partyCode}] Calculated Date Range: ${dateRangeStr}`, "success");
    
    const b2Value = filteredOdRows[1] ? cleanCell(filteredOdRows[1][1]) : "";
    const p2Value = filteredOdRows[1] ? cleanCell(filteredOdRows[1][15]) : "";
    const b2p2String = (b2Value || p2Value) ? `${b2Value}/${p2Value}` : "—";
    
    // Step 6: Separate Partly Cancelled Orders
    addLog(`[${partyCode}] Grouping OD Rows by Column H (Order ID) to find duplicate entries...`, "info");
    const orderGroups = new Map();
    for (let r = 1; r < filteredOdRows.length; r++) {
        const row = filteredOdRows[r];
        const orderId = cleanCell(row[7]);
        if (orderId) {
            if (!orderGroups.has(orderId)) {
                orderGroups.set(orderId, []);
            }
            orderGroups.get(orderId).push(row);
        }
    }
    
    addLog(`[${partyCode}] Checking for Partly Cancelled groups (mixed blank/value status in W)...`, "info");
    const rowsToMove = new Set();
    let movedRowCount = 0;
    
    for (const [orderId, grp] of orderGroups.entries()) {
        if (grp.length > 1) {
            let hasBlank = false;
            let hasValue = false;
            
            for (const row of grp) {
                if (cleanCell(row[22]) === "") { // Column W is Index 22
                    hasBlank = true;
                } else {
                    hasValue = true;
                }
            }
            
            if (hasBlank && hasValue) {
                for (const row of grp) {
                    if (cleanCell(row[22]) === "") {
                        rowsToMove.add(row);
                    }
                }
            }
        }
    }
    
    const finalOdRows = [filteredOdRows[0]]; // header
    const partlyCancelRows = [filteredOdRows[0]]; // header
    
    for (let r = 1; r < filteredOdRows.length; r++) {
        const row = filteredOdRows[r];
        if (rowsToMove.has(row)) {
            const movedRow = [...row];
            movedRow[7] = `${movedRow[7]}-1`;
            partlyCancelRows.push(movedRow);
            movedRowCount++;
        } else {
            finalOdRows.push(row);
        }
    }
    addLog(`[${partyCode}] Partly Cancel isolates: ${movedRowCount} rows moved.`, "success");
    
    // Step 7: Load OD Column F (Index 5) from final OD into Set
    addLog(`[${partyCode}] Creating dictionary from final filtered OD (Column F)...`, "info");
    const odSet = new Set();
    for (let r = 1; r < finalOdRows.length; r++) {
        const val = finalOdRows[r][5]; // Column F (Index 5)
        const cleanVal = cleanCell(val).toLowerCase();
        if (cleanVal !== "") {
            odSet.add(cleanVal);
        }
    }
    addLog(`[${partyCode}] Final OD Dictionary loaded with ${odSet.size} unique keys.`, "success");
    
    // Step 8: Delete non-matched DT rows based on Column E (Index 4)
    addLog(`[${partyCode}] Filtering DT File: Deleting rows not present in OD Column F...`, "info");
    const filteredDtRows = [dtRows[0]]; // retain header
    let dtDeletedCount = 0;
    for (let r = 1; r < dtRows.length; r++) {
        const row = dtRows[r] || [];
        let cleanVal = cleanCell(row[4]); // Column E (Index 4)
        
        if (cleanVal.includes("`")) {
            cleanVal = cleanVal.split("`")[1] || "";
        }
        cleanVal = cleanVal.trim().toLowerCase();
        
        if (odSet.has(cleanVal)) {
            filteredDtRows.push(row);
        } else {
            dtDeletedCount++;
        }
    }
    addLog(`[${partyCode}] DT Filtering Done: Deleted ${dtDeletedCount} rows. Remaining: ${filteredDtRows.length - 1} rows.`, "success");
    
    // Step 9: Process DT status types J = "Sold" vs "Sold(cancelled)"
    addLog(`[${partyCode}] Processing DT Status column J: counting Sold vs Cancelled items...`, "info");
    let soldCnt = 0;
    let cancelCnt = 0;
    let sumVal = 0;
    const cancelledInvoices = [];
    const dtRowMetadata = [];
    const dtCellStyles = {};
    
    for (let r = 1; r < filteredDtRows.length; r++) {
        const row = filteredDtRows[r] || [];
        const status = cleanCell(row[9]); // Column J (Index 9)
        
        if (status === "Sold") {
            soldCnt++;
            sumVal += parseFloat(cleanCell(row[17])) || 0; // Column R value (index 17)
            dtRowMetadata[r] = { status: 'sold' };
        } else if (status === "Sold(cancelled)") {
            cancelCnt++;
            dtRowMetadata[r] = { status: 'cancelled' };
            
            const colEVal = cleanCell(row[4]); // Column E (Index 4)
            if (colEVal) {
                cancelledInvoices.push(colEVal);
            }
        }
    }
    addLog(`[${partyCode}] DT Status results: ${soldCnt} Sold. ${cancelCnt} Cancelled.`, "success");
    
    // Step 10: GST Not Applicable Export (VBA Export_GST_NotApplicable_FINAL_CLEAN)
    addLog(`[${partyCode}] Running GST Not Applicable checks...`, "info");
    
    // Dynamically find header indices with fallbacks
    const headerRow = filteredDtRows[0] || [];
    const findColIndex = (name, fallback) => {
        const idx = headerRow.findIndex(h => String(h || "").trim().toLowerCase() === name.toLowerCase());
        return idx !== -1 ? idx : fallback;
    };
    
    const idxAP = findColIndex("Tax Rate", 41);
    const idxAV = findColIndex("Selling Price", 47);
    const idxAX = findColIndex("Item Price(Excluding Tax)", 49);
    const idxBH = findColIndex("IGST Rate", 59);
    const idxBI = findColIndex("IGST Amount", 60);
    const idxBJ = findColIndex("CGST Amount", 61);
    const idxBK = findColIndex("SGST Amount", 62);
    const idxCJ = findColIndex("Billing State", 87);

    const gstRows = [["EE Invoice No", "Order Status", "Invoice Date", "Item Quantity", "Selling Price", "Item Price(Excluding Tax)"]];
    const gstCellStyles = {};
    let shadeIndex = 1;
    let gstCreated = false;
    
    for (let r = 1; r < filteredDtRows.length; r++) {
        const row = filteredDtRows[r] || [];
        const colG = cleanCell(row[6]); // Column G (Index 6)
        const colAp = cleanCell(row[idxAP]); // Column AP (Tax Rate)
        
        if (colG !== "" && colAp === "") {
            gstCreated = true;
            
            // Copy G (6), I (8), M (12), R (17), AV (47), AX (49)
            const newRow = [
                row[6] || "",
                row[8] || "",
                row[12] || "",
                row[17] || "",
                row[47] || "",
                row[49] || ""
            ];
            gstRows.push(newRow);
            
            // Calculate pastel shading colors using VBA math
            const Rc = 170 + ((shadeIndex * 37) % 80);
            const Gc = 170 + ((shadeIndex * 67) % 80);
            const Bc = 170 + ((shadeIndex * 97) % 80);
            const hexColor = ((1 << 24) + (Rc << 16) + (Gc << 8) + Bc).toString(16).slice(1).toUpperCase();
            
            const destRowIndex = gstRows.length - 1;
            for (let c = 0; c < 6; c++) {
                gstCellStyles[`${destRowIndex},${c}`] = {
                    fill: { fgColor: { rgb: hexColor } }
                };
            }
            
            // Ensure the row has enough elements for all columns up to the maximum index we write to (index 87 / CJ)
            const targetLength = Math.max(idxAP, idxAV, idxAX, idxBH, idxBI, idxBJ, idxBK, idxCJ) + 1;
            if (row.length < targetLength) {
                while (row.length < targetLength) {
                    row.push("");
                }
            }
            
            // Write AP (idxAP) = 5
            row[idxAP] = 5;
            
            // Get AV (Selling Price) value as float
            const valAV = parseFloat(String(row[idxAV] !== undefined ? row[idxAV] : "").replace(/,/g, "")) || 0;
            
            // Helper functions for rounding matching Excel ROUND behavior
            const round0 = (v) => Math.round(v);
            const round4 = (v) => Math.round(v * 10000) / 10000;
            
            // Calculate equivalent of: =ROUND(AV2/1.05,0)
            const valAX = round0(valAV / 1.05);
            row[idxAX] = valAX;
            
            // Calculate equivalent of: =ROUND(AV2-ROUND(AV2/1.05,4),4)
            const roundPart = round4(valAV / 1.05);
            const valBH = round4(valAV - roundPart);
            row[idxBH] = valBH;
            
            // Check Billing State CJ (idxCJ)
            const stateVal = String(row[idxCJ] || "").toLowerCase().trim();
            if (stateVal === "gujarat") {
                row[idxBI] = "0"; // BI = 0 (IGST not used)
                
                // Calculate equivalent of: =ROUND((AV2-ROUND(AV2/1.05,4))/2,4)
                const valBJ = round4((valAV - roundPart) / 2);
                row[idxBJ] = valBJ; // BJ (CGST)
                row[idxBK] = valBJ; // BK (SGST, same as CGST)
            } else {
                // Calculate equivalent of: =ROUND(AV2-ROUND(AV2/1.05,4),4)
                const valBI = round4(valAV - roundPart);
                row[idxBI] = valBI; // BI (IGST)
                row[idxBJ] = "0";   // BJ = 0 (CGST not used)
                row[idxBK] = "0";   // BK = 0 (SGST not used)
            }
            
            // Apply highlights in original DT using dynamic indices
            dtCellStyles[`${r},6`] = { fill: { fgColor: { rgb: "C8FFC8" } } };
            dtCellStyles[`${r},8`] = { fill: { fgColor: { rgb: "C8FFC8" } } };
            dtCellStyles[`${r},12`] = { fill: { fgColor: { rgb: "C8FFC8" } } };
            dtCellStyles[`${r},17`] = { fill: { fgColor: { rgb: "C8FFC8" } } };
            dtCellStyles[`${r},${idxAV}`] = { fill: { fgColor: { rgb: "C8FFC8" } } };
            dtCellStyles[`${r},${idxAX}`] = { fill: { fgColor: { rgb: "C8FFC8" } } };
            dtCellStyles[`${r},${idxAP}`] = { fill: { fgColor: { rgb: "B4F0B4" } } };
            
            shadeIndex++;
        }
    }
    
    // Step 11: Duplicate Invoice Check
    addLog(`[${partyCode}] Checking for duplicate invoices in DT Column G...`, "info");
    const invoiceCounts = new Map();
    for (let r = 1; r < filteredDtRows.length; r++) {
        const val = cleanCell(filteredDtRows[r][6]);
        if (val !== "") {
            invoiceCounts.set(val, (invoiceCounts.get(val) || 0) + 1);
        }
    }
    
    let duplicateFound = false;
    const duplicateRows = [["DUPLICATE INVOICE", "COUNT"]];
    for (const [invoice, count] of invoiceCounts.entries()) {
        if (count > 1) {
            duplicateFound = true;
            duplicateRows.push([invoice, count]);
        }
    }
    
    // Step 12: Master Combined Report Join (Run strictly after DT file changes & Rate/GST calculations)
    addLog(`[${partyCode}] Master Combined Step: Loading updated DT lookup dictionary...`, "info");
    
    // Ensure GST processing has completed before creating Combined PR file
    // GST changes are already applied to filteredDtRows in Step 10
    addLog(`[${partyCode}] GST processing complete. Proceeding with Combined PR file generation...`, "success");
    
    const dtDict = new Map();
    for (let r = 1; r < filteredDtRows.length; r++) {
        const row = filteredDtRows[r] || [];
        const key = cleanKey(row[4]); // Column E (index 4)
        
        if (key !== "") {
            if (!dtDict.has(key)) {
                // Pull calculated Item Cost & Tax/HSN from DT after GST Not Applicable & Rate calculations
                // Prioritize GST-calculated values (idxAX) over original values
                let costVal = "";
                if (row[idxAX] !== undefined && String(row[idxAX]).trim() !== "") {
                    costVal = row[idxAX];
                } else if (row[58] !== undefined && String(row[58]).trim() !== "") {
                    costVal = row[58];
                } else if (row[49] !== undefined && String(row[49]).trim() !== "") {
                    costVal = row[49];
                } else {
                    costVal = row[47] || "";
                }

                let hsnVal = "";
                if (row[25] !== undefined && String(row[25]).trim() !== "") {
                    hsnVal = String(row[25]);
                } else if (row[idxAP] !== undefined && String(row[idxAP]).trim() !== "") {
                    hsnVal = String(row[idxAP]);
                }

                dtDict.set(key, [
                    row[6] || "",   // Column G (index 6) -> New Invoice ID
                    row[17] || "",  // Column R (index 17) -> Quantity
                    hsnVal,         // Column Z / AP -> HSN / Tax Rate
                    costVal         // Column BG / AX / AV -> Item Cost / Calculated Rate
                ]);
            }
        }
    }
    
    const combinedRows = [[
        "Order ID", "Invoice ID", "New Invoice ID", "Invoice Reference Number (IRN)",
        "Shipment date", "Invoice date", "GST ID", "SKU ID", "SKU", "Item Title",
        "Quantity", "Item Cost", "GST Rate", "CESS Rate", "HSN", "Warehouse Code/Name",
        "Status", "state code"
    ]];
    
    for (let r = 1; r < finalOdRows.length; r++) {
        const odRow = finalOdRows[r] || [];
        const key = cleanKey(odRow[5]); // Column F (index 5)
        
        const newCombinedRow = new Array(18).fill("");
        newCombinedRow[0] = odRow[5] || ""; // Order ID (Col 6 / F)
        newCombinedRow[1] = odRow[6] || ""; // Invoice ID (Col 7 / G)
        newCombinedRow[4] = odRow[8] || ""; // Shipment date (Col 9 / I)
        newCombinedRow[5] = odRow[8] || ""; // Invoice date (Col 9 / I)
        newCombinedRow[6] = "24AAECE9149B1ZU"; // GST ID Constant
        newCombinedRow[7] = odRow[11] || ""; // SKU ID (Col 12 / L)
        newCombinedRow[8] = odRow[10] || ""; // SKU (Col 11 / K)
        newCombinedRow[9] = odRow[16] || ""; // Item Title (Col 17 / Q)
        newCombinedRow[12] = "5%"; // GST Rate Constant
        newCombinedRow[15] = (odRow[1] || "") + "/" + (odRow[15] || ""); // Warehouse
        newCombinedRow[16] = "Not Submitted"; // Status Constant
        newCombinedRow[17] = odRow[43] || ""; // State Code (Col 44 / AR)
        
        if (key !== "") {
            if (dtDict.has(key)) {
                const dtInfo = dtDict.get(key);
                newCombinedRow[2] = dtInfo[0]; // New Invoice ID from DT
                newCombinedRow[10] = dtInfo[1]; // Quantity from DT
                newCombinedRow[14] = dtInfo[2]; // HSN from DT
                newCombinedRow[11] = dtInfo[3]; // Calculated Item Cost / Rate from DT
            }
        }
        combinedRows.push(newCombinedRow);
    }
    
    // Step 13: Extrapolate DT Invoice Range (Column G)
    let minNum = Infinity;
    let maxNum = -Infinity;
    let invoicePrefix = "";
    
    for (let r = 1; r < filteredDtRows.length; r++) {
        const row = filteredDtRows[r];
        if (row && row[6] !== undefined) {
            const cleanVal = String(row[6]).trim();
            if (cleanVal !== "") {
                const parts = cleanVal.split('-');
                if (parts.length >= 2) {
                    const lastPart = parts[parts.length - 1];
                    const curNum = parseInt(lastPart, 10);
                    if (!isNaN(curNum) && curNum > 0) {
                        if (curNum < minNum) minNum = curNum;
                        if (curNum > maxNum) maxNum = curNum;
                        invoicePrefix = parts[0];
                    }
                }
            }
        }
    }
    
    let generatedRange = "";
    if (minNum !== Infinity && maxNum !== -Infinity) {
        generatedRange = `${invoicePrefix}-${minNum}-${maxNum}`;
    } else {
        generatedRange = "RangeNotFound";
    }
    
    // Formulate names matching user specifications
    const odNameStr = `${partyCode}-(${invoicePrefix}-${minNum}-${maxNum})-OD`;
    const dtNameStr = `${partyCode}-(${minNum}-${maxNum})-DT`;
    const combinedNameStr = `${partyCode}-(${invoicePrefix}-${minNum}-${maxNum})-PR`;
    
    const finalOdFileName = `${odNameStr}.xlsx`;
    const finalDtFileName = `${dtNameStr}.xlsx`;
    const finalCombinedFileName = `${combinedNameStr}.xlsx`;
    
    // Auto-update inputs ONLY if in single party mode
    if (getUniquePartyCodes().length === 1) {
        inputOdName.value = odNameStr;
        inputDtName.value = dtNameStr;
        inputCombinedName.value = combinedNameStr;
    }
    
    // Step 14: Compile sheets and buffers
    addLog(`[${partyCode}] Compiling worksheets...`, "info");
    
    // Compile OD
    const odWS = XLSX.utils.aoa_to_sheet(finalOdRows);
    const odWB = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(odWB, odWS, "OD");
    const odArrayBuffer = XLSX.write(odWB, { bookType: 'xlsx', type: 'array' });
    const odBlob = new Blob([odArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Compile DT
    const dtWS = XLSX.utils.aoa_to_sheet(filteredDtRows);
    const dtWB = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(dtWB, dtWS, "Sheet1");
    for (const key in dtCellStyles) {
        const [r, c] = key.split(',').map(Number);
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (dtWS[cellRef]) {
            dtWS[cellRef].s = dtCellStyles[key];
        }
    }
    const dtArrayBuffer = XLSX.write(dtWB, { bookType: 'xlsx', type: 'array' });
    const dtBlob = new Blob([dtArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Compile Combined Master
    const combWS = XLSX.utils.aoa_to_sheet(combinedRows);
    const combWB = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(combWB, combWS, "Combined Master");
    for (let r = 1; r < combinedRows.length; r++) {
        const colorIndex = (r - 1) % 7;
        const colorsHex = ["FFF5F5", "FFFAEB", "FAFFF0", "F0FFF5", "F0F8FF", "F8F0FF", "FFF0FA"];
        const hexColor = colorsHex[colorIndex];
        for (let c = 0; c < 18; c++) {
            const cellRef = XLSX.utils.encode_cell({ r, c });
            if (combWS[cellRef]) {
                combWS[cellRef].s = { fill: { fgColor: { rgb: hexColor } } };
            }
        }
    }
    const combArrayBuffer = XLSX.write(combWB, { bookType: 'xlsx', type: 'array' });
    const combBlob = new Blob([combArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Store renamed file references back in state
    odFileObj.originalFile = odBlob;
    odFileObj.renamedName = finalOdFileName;
    odFileObj.category = "OD";
    odFileObj.partyCode = partyCode;
    odFileObj.partyRange = generatedRange;
    odFileObj.parsedAOA = finalOdRows;
    
    dtFileObj.originalFile = dtBlob;
    dtFileObj.renamedName = finalDtFileName;
    dtFileObj.category = "DT";
    dtFileObj.partyCode = partyCode;
    dtFileObj.partyRange = generatedRange;
    dtFileObj.parsedAOA = filteredDtRows;
    dtFileObj.rowMetadata = dtRowMetadata;
    dtFileObj.cellStyles = dtCellStyles;
    
    // Push Combined file to filesList
    filesList.push({
        id: nextId++,
        name: finalCombinedFileName,
        path: finalCombinedFileName,
        ext: "xlsx",
        originalFile: combBlob,
        category: "Combined",
        renamedName: finalCombinedFileName,
        partyCode: partyCode,
        partyRange: generatedRange,
        parsedAOA: combinedRows
    });
    
    // Save Partly Cancel file if rows exist
    if (movedRowCount > 0) {
        const pcWS = XLSX.utils.aoa_to_sheet(partlyCancelRows);
        const pcWB = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(pcWB, pcWS, "PARTLY CANCEL");
        const pcArrayBuffer = XLSX.write(pcWB, { bookType: 'xlsx', type: 'array' });
        const pcBlob = new Blob([pcArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        filesList.push({
            id: nextId++,
            name: `${partyCode}-PARTLY CANCEL ORDER.xlsx`,
            path: `${partyCode}-PARTLY CANCEL ORDER.xlsx`,
            ext: "xlsx",
            originalFile: pcBlob,
            category: "unmatched",
            renamedName: "PARTLY CANCEL ORDER.xlsx",
            partyCode: partyCode,
            partyRange: generatedRange,
            parsedAOA: partlyCancelRows
        });
        addLog(`[${partyCode}] Partly Cancel file packaged.`, "success");
    }
    
    // Save GST Not Applicable file if created
    if (gstCreated) {
        const gstWS = XLSX.utils.aoa_to_sheet(gstRows);
        const gstWB = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(gstWB, gstWS, "GST NOT APPLICABLE");
        for (const key in gstCellStyles) {
            const [r, c] = key.split(',').map(Number);
            const cellRef = XLSX.utils.encode_cell({ r, c });
            if (gstWS[cellRef]) {
                gstWS[cellRef].s = gstCellStyles[key];
            }
        }
        const gstArrayBuffer = XLSX.write(gstWB, { bookType: 'xlsx', type: 'array' });
        const gstBlob = new Blob([gstArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        filesList.push({
            id: nextId++,
            name: `${partyCode}-GST NOT APPLICABLE.xlsx`,
            path: `${partyCode}-GST NOT APPLICABLE.xlsx`,
            ext: "xlsx",
            originalFile: gstBlob,
            category: "unmatched",
            renamedName: "GST NOT APPLICABLE.xlsx",
            partyCode: partyCode,
            partyRange: generatedRange,
            parsedAOA: gstRows,
            cellStyles: gstCellStyles
        });
        addLog(`[${partyCode}] GST NOT APPLICABLE file packaged.`, "success");
    }
    
    // Save 2 More Invoice duplicate file if created
    if (duplicateFound) {
        const dupWS = XLSX.utils.aoa_to_sheet(duplicateRows);
        const dupWB = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(dupWB, dupWS, "DUPLICATES");
        
        const dupArrayBuffer = XLSX.write(dupWB, { bookType: 'xlsx', type: 'array' });
        const dupBlob = new Blob([dupArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        filesList.push({
            id: nextId++,
            name: `${partyCode}-2 MORE INVOICE.xlsx`,
            path: `${partyCode}-2 MORE INVOICE.xlsx`,
            ext: "xlsx",
            originalFile: dupBlob,
            category: "unmatched",
            renamedName: "2 MORE INVOICE.xlsx",
            partyCode: partyCode,
            partyRange: generatedRange,
            parsedAOA: duplicateRows
        });
        addLog(`[${partyCode}] 2 MORE INVOICE duplicate file packaged.`, "success");
    }

    if (!isBatchMode) {
        // Save SUMMARY file containing Party details in sheet 1, and Log details in sheet 2
        const partyCodeName = getPartyCodeName(partyCode);
        const summaryWS1 = XLSX.utils.aoa_to_sheet([
            [partyCodeName],
            [generatedRange]
        ]);
        
        const summaryWS2 = XLSX.utils.aoa_to_sheet([
            ["File Name", "Invoice Range", "Date Range", "B2 / P2 Value"],
            [finalOdFileName, generatedRange, dateRangeStr, b2p2String]
        ]);
        
        const summaryWB = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(summaryWB, summaryWS1, "Party Details");
        XLSX.utils.book_append_sheet(summaryWB, summaryWS2, "Log Details");
        
        const summaryArrayBuffer = XLSX.write(summaryWB, { bookType: 'xlsx', type: 'array' });
        const summaryBlob = new Blob([summaryArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        const summaryFileName = getSummaryTimestampFilename();
        filesList.push({
            id: nextId++,
            name: `${partyCode}-${summaryFileName}`,
            path: `${partyCode}-${summaryFileName}`,
            ext: "xlsx",
            originalFile: summaryBlob,
            category: "unmatched",
            renamedName: summaryFileName,
            partyCode: partyCode,
            partyRange: generatedRange,
            parsedAOA: [
                [partyCodeName],
                [generatedRange]
            ]
        });
        addLog(`[${partyCode}] "${summaryFileName}" generated.`, "success");
    }
    
    return {
        odName: finalOdFileName,
        generatedRange,
        dateRangeStr,
        b2p2String,
        soldCnt,
        cancelCnt,
        cancelledInvoices
    };
}

// Main Advanced Content Join & Process Logic (Handles Single vs Batch mode)
async function processUploadedFiles() {
    const uniqueCodes = getUniquePartyCodes();
    
    if (uniqueCodes.length === 0) {
        showToast("No party files detected in the uploaded contents.", "error");
        return;
    }
    
    showLoading("Running Excel Pipeline...", 2);
    clearLogs();
    await new Promise(r => setTimeout(r, 50)); // Allow UI to update
    
    try {
        if (uniqueCodes.length === 1) {
            // SINGLE PARTY MODE (Uses manual mappings if provided, else auto-pairs)
            const odId = parseInt(selectOdFile.value);
            const dtId = parseInt(selectDtFile.value);
            const summaryId = parseInt(selectSummaryFile.value);
            
            let odFileObj, dtFileObj, summaryFileObj;
            const partyCode = uniqueCodes[0];
            
            if (odId && dtId && summaryId) {
                odFileObj = filesList.find(f => f.id === odId);
                dtFileObj = filesList.find(f => f.id === dtId);
                summaryFileObj = filesList.find(f => f.id === summaryId);
            } else {
                // Auto-assignment fallback
                const groupFiles = filesList.filter(f => getPartyCode(f) === partyCode);
                odFileObj = groupFiles.find(f => f.category === 'OD' || f.name.toLowerCase().includes('dropship') || f.name.toLowerCase().includes('seller_orders_report'));
                dtFileObj = groupFiles.find(f => f.category === 'DT' || f.name.toLowerCase().includes('taxsales') || f.name.toLowerCase().includes('tax'));
                summaryFileObj = groupFiles.find(f => f.category === 'Summary' || f.name.toLowerCase().includes('summary') || f.name.toLowerCase().includes('arrange') || f.name.toLowerCase().includes('brand') || f.name.toLowerCase().includes('central'));
                
                // Fallback 1: If no summary file was matched by name/category, use the remaining file in the group
                if (!summaryFileObj) {
                    summaryFileObj = groupFiles.find(f => f !== odFileObj && f !== dtFileObj);
                }
                
                // Fallback 2: If still missing, check global
                if (!summaryFileObj) {
                    summaryFileObj = filesList.find(f => f.category === 'Summary' || f.name.toLowerCase().includes('summary') || f.name.toLowerCase().includes('arrange') || f.name.toLowerCase().includes('brand') || f.name.toLowerCase().includes('central'));
                }
            }
            
            if (!odFileObj || !dtFileObj || !summaryFileObj) {
                const missing = [];
                if (!odFileObj) missing.push("OD File");
                if (!dtFileObj) missing.push("DT File");
                if (!summaryFileObj) missing.push("Sale Summary File");
                showToast(`Missing required files: ${missing.join(', ')}`, "error");
                hideLoading();
                return;
            }
            
            // Clean up previous run dynamic files
            filesList = filesList.filter(f => 
                f.category !== "Combined" && 
                f.name !== "PARTLY CANCEL ORDER.xlsx" && 
                f.name !== "GST NOT APPLICABLE.xlsx" && 
                f.name !== "2 MORE INVOICE.xlsx" && 
                !f.name.toLowerCase().includes("myntra invoice summary") &&
                f.name !== "SUMMARY.xlsx" &&
                !f.name.endsWith("-PARTLY CANCEL ORDER.xlsx") && 
                !f.name.endsWith("-GST NOT APPLICABLE.xlsx") && 
                !f.name.endsWith("-2 MORE INVOICE.xlsx") &&
                !f.name.endsWith("-SUMMARY.xlsx")
            );
            
            updateProgress(10, "Loading OD sheet data...");
            await new Promise(r => setTimeout(r, 30));
            const metrics = await processPartyPipeline(odFileObj, dtFileObj, summaryFileObj, partyCode);
            updateProgress(90, "Finalizing output files...");
            await new Promise(r => setTimeout(r, 30));
            
            // Update UI Details Log elements for Single Mode
            logTdFilename.textContent = metrics.odName;
            logTdRange.textContent = metrics.generatedRange;
            logTdDates.textContent = metrics.dateRangeStr;
            logTdB2p2.textContent = metrics.b2p2String;
            
            statDtSold.textContent = metrics.soldCnt;
            statDtCancelled.textContent = metrics.cancelCnt;
            
            // Populate Cancelled Invoices badges list
            cancelledInvoicesList.innerHTML = '';
            if (metrics.cancelledInvoices && metrics.cancelledInvoices.length > 0) {
                metrics.cancelledInvoices.forEach(inv => {
                    const badge = document.createElement('span');
                    badge.className = 'cancelled-invoice-badge';
                    badge.textContent = inv;
                    badge.addEventListener('click', () => {
                        searchInput.value = inv;
                        renderFilesTable();
                    });
                    cancelledInvoicesList.appendChild(badge);
                });
            } else {
                cancelledInvoicesList.innerHTML = '<span class="text-muted">No cancelled invoices found.</span>';
            }
            
        } else {
            // BATCH MODE: Loop through and process all party folder datasets automatically
            addLog(`Batch Mode Active: Processing ${uniqueCodes.length} parties.`, "warning");
            
            // Clean up previous run dynamic files
            filesList = filesList.filter(f => 
                f.category !== "Combined" && 
                f.name !== "PARTLY CANCEL ORDER.xlsx" && 
                f.name !== "GST NOT APPLICABLE.xlsx" && 
                f.name !== "2 MORE INVOICE.xlsx" && 
                !f.name.toLowerCase().includes("myntra invoice summary") &&
                f.name !== "SUMMARY.xlsx" &&
                !f.name.endsWith("-PARTLY CANCEL ORDER.xlsx") && 
                !f.name.endsWith("-GST NOT APPLICABLE.xlsx") && 
                !f.name.endsWith("-2 MORE INVOICE.xlsx") &&
                !f.name.endsWith("-SUMMARY.xlsx")
            );
            
            let successCount = 0;
            const allCancelledInvoices = [];
            const batchMetrics = [];
            
            for (let pi = 0; pi < uniqueCodes.length; pi++) {
                const partyCode = uniqueCodes[pi];
                const batchBase = 5;
                const batchRange = 85;
                const partyProgress = batchBase + Math.round((pi / uniqueCodes.length) * batchRange);
                updateProgress(partyProgress, `Processing Party ${partyCode} (${pi + 1}/${uniqueCodes.length})...`);
                await new Promise(r => setTimeout(r, 30));
                
                const groupFiles = filesList.filter(f => getPartyCode(f) === partyCode);
                
                const odFile = groupFiles.find(f => f.category === 'OD' || f.name.toLowerCase().includes('dropship') || f.name.toLowerCase().includes('seller_orders_report'));
                const dtFile = groupFiles.find(f => f.category === 'DT' || f.name.toLowerCase().includes('taxsales') || f.name.toLowerCase().includes('tax'));
                let summaryFile = groupFiles.find(f => f.category === 'Summary' || f.name.toLowerCase().includes('summary') || f.name.toLowerCase().includes('arrange') || f.name.toLowerCase().includes('brand') || f.name.toLowerCase().includes('central') || f.name.toLowerCase().includes('party') || f.name.toLowerCase().includes('database'));
                
                // Fallback 1: If no summary file was matched by name/category, use the remaining file in the group that is neither OD nor DT
                if (!summaryFile) {
                    summaryFile = groupFiles.find(f => f !== odFile && f !== dtFile);
                    if (summaryFile) {
                        addLog(`[${partyCode}] Summary file not matched by name. Using other file in folder: ${summaryFile.name}`, "warning");
                    }
                }
                
                // Fallback 2: Fallback to global summary file if party-specific summary file is missing
                if (!summaryFile) {
                    summaryFile = filesList.find(f => f.category === 'Summary' || f.name.toLowerCase().includes('summary') || f.name.toLowerCase().includes('arrange') || f.name.toLowerCase().includes('brand') || f.name.toLowerCase().includes('central') || f.name.toLowerCase().includes('party') || f.name.toLowerCase().includes('database'));
                    if (summaryFile) {
                        addLog(`[${partyCode}] Summary file not found. Falling back to global summary file: ${summaryFile.name}`, "warning");
                    }
                }
                
                if (odFile && dtFile && summaryFile) {
                    try {
                        const metrics = await processPartyPipeline(odFile, dtFile, summaryFile, partyCode, true);
                        successCount++;
                        if (metrics.cancelledInvoices) {
                            allCancelledInvoices.push(...metrics.cancelledInvoices);
                        }
                        batchMetrics.push({
                            partyCode: partyCode,
                            partyCodeName: getPartyCodeName(partyCode),
                            odName: metrics.odName,
                            generatedRange: metrics.generatedRange,
                            dateRangeStr: metrics.dateRangeStr,
                            b2p2String: metrics.b2p2String
                        });
                    } catch (err) {
                        addLog(`Error processing Party ${partyCode}: ${err.message}`, "error");
                    }
                } else {
                    const missing = [];
                    if (!odFile) missing.push("OD File");
                    if (!dtFile) missing.push("DT File");
                    if (!summaryFile) missing.push("Sale Summary File");
                    addLog(`Skipping Party ${partyCode}: Missing files: ${missing.join(', ')}`, "error");
                }
            }
            
            // Generate single combined SUMMARY file for the entire batch
            if (batchMetrics.length > 0) {
                const ws1Rows = [];
                batchMetrics.forEach(m => {
                    ws1Rows.push([m.partyCodeName]);
                    ws1Rows.push([m.generatedRange]);
                    ws1Rows.push([]); // blank separator
                });
                const summaryWS1 = XLSX.utils.aoa_to_sheet(ws1Rows);
                
                const ws2Rows = [["File Name", "Invoice Range", "Date Range", "B2 / P2 Value"]];
                batchMetrics.forEach(m => {
                    ws2Rows.push([m.odName, m.generatedRange, m.dateRangeStr, m.b2p2String]);
                });
                const summaryWS2 = XLSX.utils.aoa_to_sheet(ws2Rows);
                
                const summaryWB = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(summaryWB, summaryWS1, "Party Details");
                XLSX.utils.book_append_sheet(summaryWB, summaryWS2, "Log Details");
                
                const summaryArrayBuffer = XLSX.write(summaryWB, { bookType: 'xlsx', type: 'array' });
                const summaryBlob = new Blob([summaryArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                
                const summaryFileName = getSummaryTimestampFilename();
                // Add ONE combined SUMMARY file at the root level (not per-party)
                filesList.push({
                    id: nextId++,
                    name: summaryFileName,
                    path: summaryFileName,
                    ext: "xlsx",
                    originalFile: summaryBlob,
                    category: "unmatched",
                    renamedName: summaryFileName,
                    partyCode: "__BATCH_ROOT__",
                    partyRange: "",
                    parsedAOA: ws1Rows
                });
                addLog(`Combined "${summaryFileName}" generated containing logs for all ${batchMetrics.length} parties.`, "success");
            }
            
            updateProgress(92, "Building summary files...");
            await new Promise(r => setTimeout(r, 30));
            addLog(`Batch Process Finished. Successfully processed ${successCount}/${uniqueCodes.length} parties.`, "success");
            
            // Set batch general indicators in UI
            logTdFilename.textContent = `Batch (${successCount} parties)`;
            logTdRange.textContent = "See SUMMARY.xlsx in each folder";
            logTdDates.textContent = "See SUMMARY.xlsx in each folder";
            logTdB2p2.textContent = "See SUMMARY.xlsx in each folder";
            
            statDtSold.textContent = "Multiple";
            statDtCancelled.textContent = "Multiple";
            
            // Populate Cancelled Invoices badges list for all parties combined
            cancelledInvoicesList.innerHTML = '';
            if (allCancelledInvoices.length > 0) {
                allCancelledInvoices.forEach(inv => {
                    const badge = document.createElement('span');
                    badge.className = 'cancelled-invoice-badge';
                    badge.textContent = inv;
                    badge.addEventListener('click', () => {
                        searchInput.value = inv;
                        renderFilesTable();
                    });
                    cancelledInvoicesList.appendChild(badge);
                });
            } else {
                cancelledInvoicesList.innerHTML = '<span class="text-muted">No cancelled invoices found.</span>';
            }
        }
        
        isProcessed = true;
        updateStats();
        renderFilesTable();
        
        btnProcessAction.classList.add('hidden');
        dashboardControls.classList.remove('hidden');
        hideLoading();
        showToast("Pipeline completed successfully!", "success");
    } catch (err) {
        console.error(err);
        hideLoading();
        showToast("Error processing pipeline: " + err.message, "error");
        addLog("Critical pipeline error: " + err.message, "error");
    }
}

// Render Preview Table
function renderFilesTable() {
    filesTbody.innerHTML = '';
    const query = searchInput.value.toLowerCase().trim();
    
    const filteredFiles = filesList.filter(file => 
        file.name.toLowerCase().includes(query) || 
        file.path.toLowerCase().includes(query) ||
        (isProcessed && file.category.toLowerCase().includes(query)) ||
        (isProcessed && file.renamedName.toLowerCase().includes(query))
    );

    if (filteredFiles.length === 0) {
        filesTbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                    No matching files found.
                </td>
            </tr>
        `;
        return;
    }

    filteredFiles.forEach((file, index) => {
        const tr = document.createElement('tr');
        
        if (isProcessed) {
            const colorIndex = index % 7;
            tr.className = `row-color-${colorIndex}`;
        }
        
        // Category Badge
        let badgeClass = 'badge-unmatched';
        let badgeText = 'PENDING';
        
        if (isProcessed) {
            badgeText = file.category;
            if (file.category === 'OD') badgeClass = 'badge-od';
            if (file.category === 'DT') badgeClass = 'badge-dt';
            if (file.category === 'Combined') {
                badgeClass = 'badge-od'; // Master Blue
                badgeText = 'COMBINED';
            }
        }

        const displayPath = file.path !== file.name ? file.path : '';
        
        const nameColumnHTML = isProcessed
            ? `<span class="file-name clickable-filename" onclick="inspectFile(${file.id})" title="Click to inspect spreadsheet rows">${file.name}</span>`
            : `<span class="file-name" title="${file.name}">${file.name}</span>`;

        const displayRenamed = isProcessed ? file.renamedName : '—';
        let displayRenamedClass = isProcessed && file.category !== 'unmatched' ? `text-${file.category.toLowerCase()}` : '';
        if (file.category === 'Combined') displayRenamedClass = 'text-od';

        const actionCell = isProcessed 
            ? `<button class="btn-action" onclick="downloadSingleFile(${file.id})" title="Download renamed file">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
               </button>`
            : `<span style="color: var(--text-muted); font-size: 0.8rem;">Ready</span>`;
        
        tr.innerHTML = `
            <td>
                <div class="file-info">
                    <div class="file-icon">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </div>
                    <div class="file-name-container">
                        ${nameColumnHTML}
                        ${displayPath ? `<span class="file-path" title="${displayPath}">${displayPath}</span>` : ''}
                    </div>
                </div>
            </td>
            <td>
                <span class="badge ${badgeClass}">${badgeText}</span>
            </td>
            <td>
                <div class="original-arrow">
                    <span class="arrow-icon">→</span>
                    <strong class="${displayRenamedClass}">${displayRenamed}</strong>
                </div>
            </td>
            <td style="text-align: center;">
                ${actionCell}
            </td>
        `;
        
        filesTbody.appendChild(tr);
    });
}

// Download single file renamed
window.downloadSingleFile = function(fileId) {
    const file = filesList.find(f => f.id === fileId);
    if (!file) return;
    
    const blob = file.originalFile;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.renamedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1000);
    showToast(`Downloaded ${file.renamedName}`, "success");
};

// Spreadsheet Grid Inspector Modal
window.inspectFile = function(fileId) {
    const file = filesList.find(f => f.id === fileId);
    if (!file) return;
    
    modalTitle.textContent = `Inspect File: ${file.renamedName}`;
    inspectorThead.innerHTML = '';
    inspectorTbody.innerHTML = '';
    
    if (!file.parsedAOA || file.parsedAOA.length === 0) {
        inspectorTbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 2rem;">No spreadsheet preview rows available.</td></tr>';
        inspectorModal.classList.add('show');
        return;
    }
    
    const rows = file.parsedAOA;
    const maxRows = Math.min(rows.length, 50); // Preview first 50 rows
    const headers = rows[0] || [];
    
    // Header row
    const trHead = document.createElement('tr');
    headers.forEach((h, colIndex) => {
        const th = document.createElement('th');
        th.style.padding = '0.75rem 1rem';
        th.style.color = 'var(--text-secondary)';
        th.style.fontSize = '0.75rem';
        th.style.borderBottom = '1px solid rgba(255, 255, 255, 0.08)';
        
        const excelLetter = getExcelColumnLetter(colIndex);
        th.innerHTML = `<span style="display:block; font-size: 0.65rem; color: var(--text-muted);">${excelLetter}</span>${h || ''}`;
        trHead.appendChild(th);
    });
    inspectorThead.appendChild(trHead);
    
    // Body rows
    for (let r = 1; r < maxRows; r++) {
        const row = rows[r] || [];
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(255, 255, 255, 0.02)';
        
        let rowClass = '';
        if (file.rowMetadata && file.rowMetadata[r]) {
            const status = file.rowMetadata[r].status;
            if (status === 'sold') rowClass = 'row-status-sold';
            if (status === 'cancelled') rowClass = 'row-status-cancelled';
        } else if (file.category === 'OD' || file.category === 'Combined') {
            rowClass = `row-color-${(r - 1) % 7}`;
        }
        
        if (rowClass) {
            tr.className = rowClass;
        }
        
        const rowLength = Math.max(row.length, headers.length);
        for (let c = 0; c < rowLength; c++) {
            const td = document.createElement('td');
            td.style.padding = '0.6rem 1rem';
            td.style.borderRight = '1px solid rgba(255, 255, 255, 0.01)';
            
            const cellValue = row[c] !== undefined ? row[c] : '';
            td.textContent = cellValue;
            
            // Apply custom cell styling triggers
            if (file.cellStyles && file.cellStyles[`${r},${c}`]) {
                const style = file.cellStyles[`${r},${c}`];
                if (style.fill && style.fill.fgColor) {
                    const rgb = style.fill.fgColor.rgb;
                    if (rgb === "C8FFC8") {
                        td.style.backgroundColor = 'rgba(200, 255, 200, 0.18)';
                        td.style.color = '#a7f3d0';
                    } else if (rgb === "B4F0B4") {
                        td.style.backgroundColor = 'rgba(180, 240, 180, 0.22)';
                        td.style.color = '#6ee7b7';
                    } else {
                        // Dynamic shade colors for GST Not Applicable rows
                        td.style.backgroundColor = `rgba(${parseInt(rgb.slice(0,2),16)}, ${parseInt(rgb.slice(2,4),16)}, ${parseInt(rgb.slice(4,6),16)}, 0.15)`;
                    }
                }
            }
            tr.appendChild(td);
        }
        inspectorTbody.appendChild(tr);
    }
    
    inspectorModal.classList.add('show');
};

// Helper column index letter mapping (e.g. 0 -> A, 27 -> AB)
function getExcelColumnLetter(colIndex) {
    let letter = "";
    let temp = colIndex;
    while (temp >= 0) {
        letter = String.fromCharCode((temp % 26) + 65) + letter;
        temp = Math.floor(temp / 26) - 1;
    }
    return letter;
}

// Update Stats counter values
function updateStats() {
    const total = filesList.length;
    const odCount = isProcessed ? filesList.filter(f => f.category === 'OD').length : 0;
    const dtCount = isProcessed ? filesList.filter(f => f.category === 'DT').length : 0;
    const combinedCount = isProcessed ? filesList.filter(f => f.category === 'Combined').length : 0;
    const unmatchedCount = isProcessed ? filesList.filter(f => f.category === 'unmatched' && f.name !== "PARTLY CANCEL ORDER.xlsx" && f.name !== "GST NOT APPLICABLE.xlsx" && f.name !== "2 MORE INVOICE.xlsx").length : 0;
    
    statTotal.textContent = total;
    statOd.textContent = isProcessed ? odCount : '—';
    statDt.textContent = isProcessed ? dtCount : '—';
    statUnmatched.textContent = isProcessed ? unmatchedCount : '—';
    
    if (!isProcessed) {
        statDtSold.textContent = '—';
        statDtCancelled.textContent = '—';
    }
}

// Download All Files in ZIP with Collision Handling
async function downloadAllAsZip() {
    const outputFiles = filesList.filter(fileObj => {
        const cat = fileObj.category;
        const rName = fileObj.renamedName || "";
        return cat === "OD" || cat === "DT" || cat === "Combined" || 
               rName.toLowerCase().includes("summary") ||
               rName.startsWith("myntra invoice summary") ||
               rName === "SUMMARY.xlsx" || rName === "PARTLY CANCEL ORDER.xlsx" || 
               rName === "GST NOT APPLICABLE.xlsx" || rName === "2 MORE INVOICE.xlsx";
    });
    
    if (outputFiles.length === 0) {
        showToast("No processed output files to package into ZIP.", "error");
        return;
    }
    
    showLoading("Packaging renamed files into ZIP...", 5);
    const newZip = new JSZip();
    const usedPaths = new Set();
    
    try {
        const processedParties = new Set();
        outputFiles.forEach(f => {
            if (f.partyCode && f.partyCode !== "__BATCH_ROOT__") processedParties.add(f.partyCode);
        });
        const partyCodesArray = Array.from(processedParties).sort((a, b) => {
            const numA = parseInt(a, 10);
            const numB = parseInt(b, 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });
        const isBatch = partyCodesArray.length > 1;
        let zipName = "";
        
        if (partyCodesArray.length === 1) {
            zipName = `${partyCodesArray[0]} process.zip`;
        } else if (partyCodesArray.length > 1) {
            zipName = `${partyCodesArray[0]}-${partyCodesArray[partyCodesArray.length - 1]} process.zip`;
        } else if (uploadedZipBaseName && !uploadedZipBaseName.includes("bundle") && !uploadedZipBaseName.includes("myntra_data_arrange")) {
            zipName = `${uploadedZipBaseName} process.zip`;
        } else {
            zipName = "myntra_data_arrange_process.zip";
        }
        
        const keepStructure = toggleStructure.checked;

        for (let i = 0; i < outputFiles.length; i++) {
            const zipProgress = 10 + Math.round((i / outputFiles.length) * 70);
            updateProgress(zipProgress, `Adding file ${i + 1}/${outputFiles.length} to ZIP...`);
            const fileObj = outputFiles[i];
            
            let partyCode = fileObj.partyCode || getPartyCode(fileObj);
            if (!partyCode || partyCode === "PartyCode") {
                partyCode = partyCodesArray[0] || "Processed";
            }
            
            let partyRange = fileObj.partyRange;
            if (!partyRange) {
                const sibling = outputFiles.find(f => f.partyCode === partyCode && f.partyRange);
                if (sibling) {
                    partyRange = sibling.partyRange;
                }
            }
            
            const hasRange = (partyRange && partyRange !== "—" && partyRange !== "RangeNotFound");
            
            const baseFolder = partyCode;
            const subFolder = hasRange ? `${partyCode}-(${partyRange})` : `${partyCode}-(Processed)`;
            
            const filename = fileObj.renamedName;
            const lastDot = filename.lastIndexOf('.');
            const baseName = lastDot !== -1 ? filename.substring(0, lastDot) : filename;
            const extension = lastDot !== -1 ? filename.substring(lastDot) : "";
            
            const isSummary = filename.toLowerCase().includes("summary") || filename.startsWith("myntra invoice summary");

            let targetPath = "";
            if (keepStructure) {
                if (isSummary && fileObj.partyCode === "__BATCH_ROOT__") {
                    // Batch combined SUMMARY goes at the ZIP root
                    targetPath = filename;
                } else if (isSummary) {
                    // Single mode SUMMARY goes under party folder
                    targetPath = `${baseFolder}/${filename}`;
                } else {
                    targetPath = `${baseFolder}/${subFolder}/${filename}`;
                }
            } else {
                if (isSummary || filename.startsWith(`${partyCode}-`)) {
                    targetPath = filename;
                } else {
                    targetPath = `${partyCode}-${filename}`;
                }
            }
            
            let counter = 1;
            while (usedPaths.has(targetPath.toLowerCase())) {
                if (keepStructure) {
                    if (isSummary && fileObj.partyCode === "__BATCH_ROOT__") {
                        targetPath = `${baseName} (${counter})${extension}`;
                    } else if (isSummary) {
                        targetPath = `${baseFolder}/${baseName} (${counter})${extension}`;
                    } else {
                        targetPath = `${baseFolder}/${subFolder}/${baseName} (${counter})${extension}`;
                    }
                } else {
                    targetPath = `${partyCode}-${baseName} (${counter})${extension}`;
                }
                counter++;
            }
            
            usedPaths.add(targetPath.toLowerCase());
            newZip.file(targetPath, fileObj.originalFile);
        }
        
        showLoading("Generating ZIP file...", 85);
        const content = await newZip.generateAsync({ type: "blob" });
        
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = zipName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);
        
        hideLoading();
        showToast("ZIP downloaded successfully!", "success");
    } catch (error) {
        console.error(error);
        hideLoading();
        showToast("Failed to create ZIP: " + error.message, "error");
    }
}

// ==========================================
// GOOGLE SHEETS PARTY DATABASE FUNCTIONS
// ==========================================

// Helper to update visual connection status indicator
function updateDbConnectionStatus(status, message) {
    if (status === "online") {
        dbStatusDot.className = "pulse-dot status-online";
        dbStatusText.textContent = "Online";
        dbStatusText.style.color = "#10b981";
    } else if (status === "offline") {
        dbStatusDot.className = "pulse-dot status-offline";
        dbStatusText.textContent = "Offline";
        dbStatusText.style.color = "#ef4444";
    } else {
        dbStatusDot.className = "pulse-dot status-offline"; // orange sync style or pulsing
        dbStatusText.textContent = "Syncing...";
        dbStatusText.style.color = "#f59e0b";
    }
}

// Fetch records from Apps Script web app
async function loadPartyData() {
    if (!appsScriptUrl) return;
    
    updateDbConnectionStatus("sync", "Fetching party records from Google Sheets...");
    dbTbody.innerHTML = `
        <tr>
            <td colspan="3" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
                <div class="spinner" style="width: 24px; height: 24px; margin: 0 auto 1rem auto; border-width: 2px;"></div>
                Loading data from sheet...
            </td>
        </tr>
    `;

    try {
        // GET request is simple, safe from CORS preflight issues
        const response = await fetch(`${appsScriptUrl}?action=read`);
        const result = await response.json();
        
        if (result && result.status === "success") {
            partyData = result.data || [];
            updateDbConnectionStatus("online", `Synchronized. ${partyData.length} records loaded.`);
            dbCountTag.textContent = `${partyData.length} records loaded`;
            renderPartyTable();
        } else {
            const errorMsg = result ? result.message : "Invalid API response format.";
            updateDbConnectionStatus("offline", `API Error: ${errorMsg}`);
            dbTbody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center; color: var(--color-danger); padding: 3rem;">
                        Failed to fetch data: ${errorMsg}
                    </td>
                </tr>
            `;
        }
    } catch (err) {
        console.error(err);
        updateDbConnectionStatus("offline", `Network error: ${err.message}`);
        dbTbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; color: var(--color-danger); padding: 3rem;">
                    Network Connection Error. Make sure your Apps Script is deployed as 'Anyone' and access headers are correct.
                </td>
            </tr>
        `;
    }
}

// Add New Party Record
async function addPartyRecord(code, name) {
    if (!appsScriptUrl) {
        showToast("No connected API URL.", "error");
        return;
    }
    
    showLoading("Adding party record to Google Sheet...");
    updateDbConnectionStatus("sync", "Adding record: " + name + "...");
    
    try {
        // Apps Script simple post (plain text avoids CORS preflight OPTIONS)
        const response = await fetch(`${appsScriptUrl}?action=add`, {
            method: 'POST',
            body: JSON.stringify({ code: code, partyCode: name })
        });
        const result = await response.json();
        
        hideLoading();
        if (result && result.status === "success") {
            showToast(result.message || "Record added successfully!", "success");
            addPartyCodeInput.value = "";
            addPartyNameInput.value = "";
            await loadPartyData(); // reload sheet
        } else {
            const errorMsg = result ? result.message : "Failed to append record.";
            showToast(errorMsg, "error");
            updateDbConnectionStatus("online", `Error: ${errorMsg}`);
        }
    } catch (err) {
        hideLoading();
        console.error(err);
        showToast("Network Error: " + err.message, "error");
        updateDbConnectionStatus("online", `Network error during addition.`);
    }
}

// Update existing party record
async function updatePartyRecord(oldCode, newCode, name) {
    if (!appsScriptUrl) return;
    
    showLoading("Saving updates to Google Sheet...");
    
    try {
        const response = await fetch(`${appsScriptUrl}?action=update`, {
            method: 'POST',
            body: JSON.stringify({ oldCode: oldCode, newCode: newCode, partyCode: name })
        });
        const result = await response.json();
        
        hideLoading();
        if (result && result.status === "success") {
            showToast(result.message || "Details updated successfully!", "success");
            editingPartyCode = null; // exit edit mode
            await loadPartyData();
        } else {
            const errorMsg = result ? result.message : "Failed to update record.";
            showToast(errorMsg, "error");
        }
    } catch (err) {
        hideLoading();
        console.error(err);
        showToast("Failed to update record: " + err.message, "error");
    }
}

// Delete existing party record
async function deletePartyRecord(code) {
    if (!appsScriptUrl) return;
    
    showDeleteConfirmation({
        title: "Delete Party Record",
        message: `Are you sure you want to delete party with Code "${code}"? This will be removed from Google Sheet database.`,
        onConfirm: async () => {
            showLoading("Deleting record from Google Sheet...");
            try {
                const response = await fetch(`${appsScriptUrl}?action=delete`, {
                    method: 'POST',
                    body: JSON.stringify({ code: code })
                });
                const result = await response.json();
                
                hideLoading();
                if (result && result.status === "success") {
                    showToast(result.message || "Record deleted successfully!", "success");
                    if (editingPartyCode === code) {
                        editingPartyCode = null;
                    }
                    await loadPartyData();
                } else {
                    const errorMsg = result ? result.message : "Failed to delete record.";
                    showToast(errorMsg, "error");
                }
            } catch (err) {
                hideLoading();
                console.error(err);
                showToast("Failed to delete record: " + err.message, "error");
            }
        }
    });
}

// Render dynamic table rows
function renderPartyTable() {
    dbTbody.innerHTML = '';
    const query = dbSearchInput.value.toLowerCase().trim();
    
    const filtered = partyData.filter(item => 
        String(item.code).toLowerCase().includes(query) || 
        String(item.partyCode).toLowerCase().includes(query)
    );
    
    if (filtered.length === 0) {
        dbTbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; color: var(--text-muted); padding: 3rem;">
                    ${partyData.length === 0 ? "No records loaded. Sync with API." : "No matching records found."}
                </td>
            </tr>
        `;
        return;
    }
    
    filtered.forEach((item, index) => {
        const tr = document.createElement('tr');
        const isEditing = (item.code === editingPartyCode);
        
        // Rainbow striping style matching processor sheet rows
        const colorIndex = index % 7;
        tr.className = `row-color-${colorIndex}`;
        
        if (isEditing) {
            // Render Editable Row with inline inputs
            tr.innerHTML = `
                <td>
                    <input type="text" id="edit-code-field" value="${item.code}" class="db-inline-input" style="font-weight:700;">
                </td>
                <td>
                    <input type="text" id="edit-name-field" value="${item.partyCode}" class="db-inline-input" style="width:95% !important;">
                </td>
                <td style="text-align: center; display: flex; justify-content: center; gap: 0.5rem; align-items: center; border-bottom: none; height: 100%;">
                    <button class="btn-action success" onclick="saveInlineEdit('${item.code}')" title="Save changes">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </button>
                    <button class="btn-action" onclick="cancelInlineEdit()" title="Cancel edit">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </td>
            `;
        } else {
            // Render standard read-only row
            tr.innerHTML = `
                <td>
                    <strong style="color: var(--text-primary); font-family: monospace; font-size: 0.9rem;">${item.code}</strong>
                </td>
                <td>
                    <span style="color: var(--text-secondary); font-weight: 500;">${item.partyCode}</span>
                </td>
                <td style="text-align: center;">
                    <div style="display: flex; justify-content: center; gap: 0.5rem; align-items: center;">
                        <button class="btn-action" onclick="startInlineEdit('${item.code}')" title="Edit row inline">
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="btn-action danger" onclick="deletePartyRecord('${item.code}')" title="Delete record">
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </td>
            `;
        }
        
        dbTbody.appendChild(tr);
    });
}

// Inline edit triggers
window.startInlineEdit = function(code) {
    editingPartyCode = code;
    renderPartyTable();
};

window.cancelInlineEdit = function() {
    editingPartyCode = null;
    renderPartyTable();
};

window.saveInlineEdit = async function(oldCode) {
    const editCodeField = document.getElementById('edit-code-field');
    const editNameField = document.getElementById('edit-name-field');
    
    if (!editCodeField || !editNameField) return;
    
    const newCode = editCodeField.value.trim();
    const newName = editNameField.value.trim();
    
    if (!newCode || !newName) {
        showToast("Inputs cannot be empty.", "error");
        return;
    }
    
    await updatePartyRecord(oldCode, newCode, newName);
};

// ==========================================
// SEPARATE FILE TAB OPERATIONS
// ==========================================

// State Variables for Separate File tab
let sepFileObj = null;
let sepParsedAOA = null;
let sepUniqueValues = [];
let sepGroups = new Map();
let sepFileNamePrefix = "";
let sepGeneratedZipBlob = null;
let sepGeneratedZipName = "";

// ==========================================
// SEPARATE FILE TAB OPERATIONS (4 Dedicated Categories, 1-Hour Session, Full View)
// ==========================================

const SEP_CATEGORIES = {
    simple: {
        id: 'simple',
        name: 'SIMPLE',
        field: 6, // Column G
        headerRows: 2,
        dataStartRow: 3,
        suffix: '-MYNTRA',
        badgeClass: 'badge-od',
        zipName: 'myntra_simple_separate.zip'
    },
    details: {
        id: 'details',
        name: 'DETAILS',
        field: 3, // Column D
        headerRows: 2,
        dataStartRow: 3,
        suffix: ' DETAILS SHEET MYNTRA',
        badgeClass: 'badge',
        zipName: 'myntra_details_separate.zip'
    },
    summary: {
        id: 'summary',
        name: 'SUMMARY',
        field: 6, // Column G
        headerRows: 2,
        dataStartRow: 3,
        suffix: ' SUMMARY SHEET MYNTRA',
        badgeClass: 'badge',
        zipName: 'myntra_summary_separate.zip'
    },
    tax: {
        id: 'tax',
        name: 'TAX SPLIT',
        field: 0, // Column A
        headerRows: 1,
        dataStartRow: 2,
        suffix: '',
        badgeClass: 'badge-dt',
        zipName: 'myntra_tax_separate.zip'
    }
};

// Category state store
let sepCategoryState = {
    simple: { file: null, fileName: '', aoa: null, uniqueValues: [], groups: new Map() },
    details: { file: null, fileName: '', aoa: null, uniqueValues: [], groups: new Map() },
    summary: { file: null, fileName: '', aoa: null, uniqueValues: [], groups: new Map() },
    tax: { file: null, fileName: '', aoa: null, uniqueValues: [], groups: new Map() }
};

let sepFullviewCategory = 'all'; // 'all', 'simple', 'details', 'summary', 'tax'
let sepSessionTimerInterval = null;

// IndexedDB Session Storage Config (1 Hour Expiry) for Separate Tab
const SEP_DB_NAME = 'MyntraSeparateCacheDB';
const SEP_DB_STORE = 'separateSession';
const SEP_DB_VERSION = 1;
const SEP_SESSION_EXPIRY_MS = 60 * 60 * 1000; // 1 Hour

function openSeparateDB() {
    return new Promise((resolve) => {
        if (!window.indexedDB) {
            resolve(null);
            return;
        }
        try {
            const req = indexedDB.open(SEP_DB_NAME, SEP_DB_VERSION);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(SEP_DB_STORE)) {
                    db.createObjectStore(SEP_DB_STORE, { keyPath: 'id' });
                }
            };
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = () => resolve(null);
        } catch (e) {
            resolve(null);
        }
    });
}

async function saveSeparateSessionToStorage() {
    try {
        const db = await openSeparateDB();
        if (!db) return;

        const hasAnyFile = Object.values(sepCategoryState).some(cat => cat.file !== null && cat.uniqueValues.length > 0);
        if (!hasAnyFile) {
            const tx = db.transaction([SEP_DB_STORE], 'readwrite');
            tx.objectStore(SEP_DB_STORE).delete('currentSession');
            hideSepSessionBanner();
            return;
        }

        const serializedCats = {};
        for (const [key, state] of Object.entries(sepCategoryState)) {
            if (state.file) {
                serializedCats[key] = {
                    fileName: state.fileName,
                    blob: state.file,
                    uniqueValues: state.uniqueValues,
                    groupsArray: Array.from(state.groups.entries())
                };
            }
        }

        const expiresAt = Date.now() + SEP_SESSION_EXPIRY_MS;
        const sessionData = {
            id: 'currentSession',
            timestamp: Date.now(),
            expiresAt: expiresAt,
            categories: serializedCats
        };

        const tx = db.transaction([SEP_DB_STORE], 'readwrite');
        tx.objectStore(SEP_DB_STORE).put(sessionData);
        startSepSessionTimer(expiresAt);
    } catch (err) {
        console.warn("Separate IndexedDB save error:", err);
    }
}

async function loadSeparateSessionFromStorage() {
    try {
        const db = await openSeparateDB();
        if (!db) return;

        const tx = db.transaction([SEP_DB_STORE], 'readonly');
        const store = tx.objectStore(SEP_DB_STORE);
        const req = store.get('currentSession');

        req.onsuccess = async () => {
            const data = req.result;
            if (!data) return;

            const now = Date.now();
            if (now > data.expiresAt) {
                clearSeparateSessionStorage();
                return;
            }

            if (data.categories) {
                let totalRestored = 0;
                for (const [key, catData] of Object.entries(data.categories)) {
                    if (catData && catData.blob) {
                        let fileBlob = catData.blob;
                        if (!(fileBlob instanceof Blob)) {
                            fileBlob = new Blob([catData.blob]);
                        }
                        
                        const groupsMap = new Map(catData.groupsArray || []);
                        sepCategoryState[key] = {
                            file: fileBlob,
                            fileName: catData.fileName || '',
                            aoa: null,
                            uniqueValues: catData.uniqueValues || [],
                            groups: groupsMap
                        };

                        // Update badge and label
                        const badge = document.getElementById(`sep-badge-${key}`);
                        const label = document.getElementById(`sep-file-label-${key}`);
                        if (badge) badge.textContent = `${catData.uniqueValues.length} unique`;
                        if (label) label.textContent = catData.fileName ? `Loaded: ${catData.fileName}` : 'Loaded';

                        totalRestored += catData.uniqueValues.length;
                    }
                }

                if (totalRestored > 0) {
                    renderAllSeparatePreviews();
                    startSepSessionTimer(data.expiresAt);
                    showToast(`Restored separate files session (${totalRestored} splits) from 1-hour cache!`, "info");
                }
            }
        };
    } catch (err) {
        console.warn("Separate IndexedDB load error:", err);
    }
}

async function clearSeparateSessionStorage() {
    try {
        const db = await openSeparateDB();
        if (!db) return;
        const tx = db.transaction([SEP_DB_STORE], 'readwrite');
        tx.objectStore(SEP_DB_STORE).delete('currentSession');
        hideSepSessionBanner();
    } catch (err) {
        console.warn("Separate IndexedDB clear error:", err);
    }
}

function startSepSessionTimer(expiresAt) {
    const banner = document.getElementById('sep-session-banner');
    const timerElem = document.getElementById('sep-session-timer');
    if (!banner || !timerElem) return;

    banner.classList.remove('hidden');

    if (sepSessionTimerInterval) clearInterval(sepSessionTimerInterval);

    const updateTimer = () => {
        const remainingMs = expiresAt - Date.now();
        if (remainingMs <= 0) {
            timerElem.textContent = "Session expired";
            clearInterval(sepSessionTimerInterval);
            clearSeparateSessionStorage();
            return;
        }
        const mins = Math.floor(remainingMs / (60 * 1000));
        const secs = Math.floor((remainingMs % (60 * 1000)) / 1000);
        timerElem.textContent = `Auto-clears in ${mins}m ${secs}s`;
    };

    updateTimer();
    sepSessionTimerInterval = setInterval(updateTimer, 1000);
}

function hideSepSessionBanner() {
    const banner = document.getElementById('sep-session-banner');
    if (banner) banner.classList.add('hidden');
    if (sepSessionTimerInterval) {
        clearInterval(sepSessionTimerInterval);
        sepSessionTimerInterval = null;
    }
}

function setupSeparateFile() {
    // Setup dropzones for each category
    ['simple', 'details', 'summary', 'tax'].forEach(catKey => {
        const dropzone = document.getElementById(`sep-dropzone-${catKey}`);
        const input = document.getElementById(`sep-file-input-${catKey}`);

        if (dropzone && input) {
            dropzone.addEventListener('click', () => input.click());
            input.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    handleSepCategoryUpload(catKey, e.target.files[0]);
                }
            });

            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('dragover');
            });

            dropzone.addEventListener('dragleave', () => {
                dropzone.classList.remove('dragover');
            });

            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleSepCategoryUpload(catKey, e.dataTransfer.files[0]);
                }
            });
        }
    });

    // Top Summary Bar buttons
    const btnSepAllFullview = document.getElementById('btn-sep-all-fullview');
    const btnSepDownloadAllZip = document.getElementById('btn-sep-download-all-zip');
    if (btnSepAllFullview) btnSepAllFullview.addEventListener('click', () => openSepFullViewModal('all'));
    if (btnSepDownloadAllZip) btnSepDownloadAllZip.addEventListener('click', () => downloadSeparateZip('all'));

    // Category Card buttons
    const btnSimpleFullview = document.getElementById('btn-sep-simple-fullview');
    const btnSimpleMoveToFolder = document.getElementById('btn-sep-simple-move-to-folder');
    const btnSimpleDownloadZip = document.getElementById('btn-sep-simple-download-zip');
    if (btnSimpleFullview) btnSimpleFullview.addEventListener('click', () => openSepFullViewModal('simple'));
    if (btnSimpleMoveToFolder) btnSimpleMoveToFolder.addEventListener('click', moveSimpleToFolderCreate);
    if (btnSimpleDownloadZip) btnSimpleDownloadZip.addEventListener('click', () => downloadSeparateZip('simple'));

    const btnDetailsFullview = document.getElementById('btn-sep-details-fullview');
    const btnDetailsDownloadZip = document.getElementById('btn-sep-details-download-zip');
    if (btnDetailsFullview) btnDetailsFullview.addEventListener('click', () => openSepFullViewModal('details'));
    if (btnDetailsDownloadZip) btnDetailsDownloadZip.addEventListener('click', () => downloadSeparateZip('details'));

    const btnSummaryFullview = document.getElementById('btn-sep-summary-fullview');
    const btnSummaryDownloadZip = document.getElementById('btn-sep-summary-download-zip');
    if (btnSummaryFullview) btnSummaryFullview.addEventListener('click', () => openSepFullViewModal('summary'));
    if (btnSummaryDownloadZip) btnSummaryDownloadZip.addEventListener('click', () => downloadSeparateZip('summary'));

    const btnTaxFullview = document.getElementById('btn-sep-tax-fullview');
    const btnTaxDownloadZip = document.getElementById('btn-sep-tax-download-zip');
    if (btnTaxFullview) btnTaxFullview.addEventListener('click', () => openSepFullViewModal('tax'));
    if (btnTaxDownloadZip) btnTaxDownloadZip.addEventListener('click', () => downloadSeparateZip('tax'));

    // Full View Modal controls
    const btnCloseSepFullview = document.getElementById('btn-close-sep-fullview');
    const sepFullviewSearch = document.getElementById('sep-fullview-search');
    if (btnCloseSepFullview) btnCloseSepFullview.addEventListener('click', closeSepFullViewModal);
    if (sepFullviewSearch) sepFullviewSearch.addEventListener('input', renderSepFullViewModalRows);

    document.querySelectorAll('.sep-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sep-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            sepFullviewCategory = btn.getAttribute('data-category') || 'all';
            renderSepFullViewModalRows();
        });
    });

    // Start Separate Button
    const btnStartSeparate = document.getElementById('btn-start-separate');
    if (btnStartSeparate) {
        btnStartSeparate.addEventListener('click', startSeparateProcess);
    }

    // Restore 1-hour session from IndexedDB if available
    loadSeparateSessionFromStorage();
}

// Handle upload / selection for a specific category (Does NOT split immediately)
async function handleSepCategoryUpload(catKey, file) {
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
        showToast("Please upload an Excel (.xlsx or .xls) file.", "error");
        return;
    }

    const catConfig = SEP_CATEGORIES[catKey];
    if (!catConfig) return;

    // Save selected file in category state
    sepCategoryState[catKey].file = file;
    sepCategoryState[catKey].fileName = file.name;
    sepCategoryState[catKey].aoa = null;
    sepCategoryState[catKey].uniqueValues = [];
    sepCategoryState[catKey].groups = new Map();

    // Update UI on dropzone
    const badge = document.getElementById(`sep-badge-${catKey}`);
    const label = document.getElementById(`sep-file-label-${catKey}`);
    if (badge) {
        badge.textContent = "Ready to Split";
        badge.style.background = "rgba(124, 58, 237, 0.12)";
        badge.style.color = "var(--primary)";
    }
    if (label) label.textContent = `Selected: ${file.name}`;

    showToast(`"${file.name}" selected for ${catConfig.name}. Click "Start Separate" to process!`, "info");
}

// Triggered when user clicks "Start Separate" button
async function startSeparateProcess() {
    const uploadedCats = Object.keys(SEP_CATEGORIES).filter(k => sepCategoryState[k].file !== null);

    if (uploadedCats.length === 0) {
        showToast("Please upload at least one Excel file in the boxes on the left.", "warning");
        return;
    }

    const sepProgress = document.getElementById('sep-progress');
    const sepProgressPercent = document.getElementById('sep-progress-percent');
    const sepProgressText = document.getElementById('sep-progress-text');
    const sepProgressFill = document.getElementById('sep-progress-fill');
    const btnStartSeparate = document.getElementById('btn-start-separate');

    if (btnStartSeparate) btnStartSeparate.disabled = true;
    if (sepProgress) sepProgress.classList.remove('hidden');

    const updateProgress = (pct, txt) => {
        if (sepProgressPercent) sepProgressPercent.textContent = `${Math.round(pct)}%`;
        if (sepProgressFill) sepProgressFill.style.width = `${pct}%`;
        if (sepProgressText) sepProgressText.textContent = txt;
    };

    updateProgress(10, "Starting separation pipeline...");
    await new Promise(r => setTimeout(r, 40));

    let totalSplitsAcrossAll = 0;

    try {
        for (let i = 0; i < uploadedCats.length; i++) {
            const catKey = uploadedCats[i];
            const catState = sepCategoryState[catKey];
            const catConfig = SEP_CATEGORIES[catKey];

            const stepBase = 10 + Math.round((i / uploadedCats.length) * 80);
            updateProgress(stepBase, `Processing ${catConfig.name}: ${catState.fileName}...`);
            await new Promise(r => setTimeout(r, 30));

            // Parse AOA
            const aoa = await readExcelAsAOA(catState.file);
            if (!aoa || aoa.length === 0) {
                continue;
            }
            catState.aoa = aoa;

            const groups = new Map();
            const uniqueValues = [];
            const dataStartRow = catConfig.dataStartRow;
            const filterField = catConfig.field;

            for (let r = dataStartRow - 1; r < aoa.length; r++) {
                const row = aoa[r];
                if (!row) continue;

                const rawVal = row[filterField];
                const cleanVal = cleanCell(rawVal).trim();

                if (cleanVal === "" || cleanVal.toLowerCase() === "warehouse code/name" || cleanVal.toLowerCase() === "party code" || cleanVal.toLowerCase() === "state code") {
                    continue;
                }

                if (!groups.has(cleanVal)) {
                    groups.set(cleanVal, []);
                    uniqueValues.push(cleanVal);
                }
                groups.get(cleanVal).push(row);
            }

            uniqueValues.sort();
            catState.uniqueValues = uniqueValues;
            catState.groups = groups;
            totalSplitsAcrossAll += uniqueValues.length;

            // Update badge and label on dropzone
            const badge = document.getElementById(`sep-badge-${catKey}`);
            const label = document.getElementById(`sep-file-label-${catKey}`);
            if (badge) {
                badge.textContent = `${uniqueValues.length} unique`;
                badge.style.background = "";
                badge.style.color = "";
            }
            if (label) label.textContent = `Loaded: ${catState.fileName}`;
        }

        updateProgress(95, "Rendering results & saving session...");
        await new Promise(r => setTimeout(r, 40));

        renderAllSeparatePreviews();
        saveSeparateSessionToStorage();

        updateProgress(100, "Done!");
        showToast(`Separation completed! ${totalSplitsAcrossAll} unique split files generated.`, "success");

        setTimeout(() => {
            if (sepProgress) {
                sepProgress.classList.add('hidden');
                if (sepProgressPercent) sepProgressPercent.textContent = "0%";
                if (sepProgressFill) sepProgressFill.style.width = "0%";
            }
            if (btnStartSeparate) btnStartSeparate.disabled = false;
        }, 1000);

    } catch (err) {
        console.error(err);
        showToast("Error processing separation: " + err.message, "error");
        if (sepProgress) sepProgress.classList.add('hidden');
        if (btnStartSeparate) btnStartSeparate.disabled = false;
    }
}

// Format date and time for filename stamp
function getDtStamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

// Clean bad filename characters
function cleanFileNameString(str) {
    return str.replace(/[\\/:*?\"<>|]/g, "").trim();
}

// Render all preview cards in Right Panel
function renderAllSeparatePreviews() {
    const emptyState = document.getElementById('sep-empty-state');
    const resultsContainer = document.getElementById('sep-results-container');
    const totalSummaryBadge = document.getElementById('sep-total-summary-badge');

    let totalSplits = 0;
    let anyLoaded = false;

    Object.keys(SEP_CATEGORIES).forEach(catKey => {
        const state = sepCategoryState[catKey];
        const card = document.getElementById(`card-sep-${catKey}`);
        const tbody = document.getElementById(`tbody-sep-${catKey}`);
        const countBadge = document.getElementById(`sep-count-${catKey}`);
        const config = SEP_CATEGORIES[catKey];

        if (state && state.file && state.uniqueValues.length > 0) {
            anyLoaded = true;
            totalSplits += state.uniqueValues.length;
            if (card) card.classList.remove('hidden');
            if (countBadge) countBadge.textContent = `${state.uniqueValues.length} unique value${state.uniqueValues.length === 1 ? '' : 's'}`;

            if (tbody) {
                tbody.innerHTML = '';
                const dtStampPlaceholder = getDtStamp();

                state.uniqueValues.forEach((val, idx) => {
                    const rows = state.groups.get(val) || [];
                    let outputName = "";
                    if (catKey === 'tax') {
                        const firstNum = val.split('-')[0] || val;
                        outputName = `${firstNum}-Tax-${val}-MYNTYRA`;
                    } else {
                        outputName = `${val}${config.suffix}`;
                    }
                    outputName = cleanFileNameString(outputName);
                    const displayFilename = `${outputName} ${dtStampPlaceholder}_${String(idx + 1).padStart(2, '0')}.xlsx`;

                    const tr = document.createElement('tr');
                    tr.className = `row-color-${idx % 7}`;
                    tr.innerHTML = `
                        <td><strong>${idx + 1}</strong></td>
                        <td><span style="font-family: monospace; font-weight: 700; color: var(--text-primary); font-size: 0.78rem;">${val}</span></td>
                        <td><span class="badge ${config.badgeClass}" style="font-weight: 700;">${rows.length} rows</span></td>
                        <td><span style="color: var(--primary); font-weight: 500; font-size: 0.76rem;">${displayFilename}</span></td>
                        <td style="text-align: center;">
                            <div style="display: inline-flex; gap: 4px;">
                                <button class="btn-action btn-inspect-split" title="Inspect first 50 rows" style="width: 24px; height: 24px; border-radius: 6px; border: none; background: rgba(124, 58, 237, 0.08); color: var(--primary); cursor: pointer;">
                                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                </button>
                                <button class="btn-action btn-del-split" title="Delete this split group" style="width: 24px; height: 24px; border-radius: 6px; border: none; background: rgba(220, 38, 38, 0.08); color: var(--color-danger); cursor: pointer;">
                                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        </td>
                    `;

                    const btnInspect = tr.querySelector('.btn-inspect-split');
                    if (btnInspect) {
                        btnInspect.addEventListener('click', () => inspectSeparateGroup(catKey, val));
                    }

                    const btnDel = tr.querySelector('.btn-del-split');
                    if (btnDel) {
                        btnDel.addEventListener('click', () => {
                            showDeleteConfirmation({
                                title: `Delete "${val}" Split?`,
                                message: `Are you sure you want to delete "${val}" (${rows.length} rows) from ${config.name}?`,
                                onConfirm: () => removeSepGroup(catKey, val)
                            });
                        });
                    }

                    tbody.appendChild(tr);
                });
            }
        } else {
            if (card) card.classList.add('hidden');
            if (tbody) tbody.innerHTML = '';
        }
    });

    if (totalSummaryBadge) {
        totalSummaryBadge.textContent = `${totalSplits} Total Unique Splits`;
    }

    if (anyLoaded) {
        if (emptyState) emptyState.classList.add('hidden');
        if (resultsContainer) resultsContainer.classList.remove('hidden');
    } else {
        if (emptyState) emptyState.classList.remove('hidden');
        if (resultsContainer) resultsContainer.classList.add('hidden');
    }

    const fullviewModal = document.getElementById('sep-fullview-modal');
    if (fullviewModal && fullviewModal.classList.contains('show')) {
        renderSepFullViewModalRows();
    }
}

// Remove a specific split group
function removeSepGroup(catKey, uniqueVal) {
    const state = sepCategoryState[catKey];
    if (!state) return;

    state.uniqueValues = state.uniqueValues.filter(v => v !== uniqueVal);
    state.groups.delete(uniqueVal);

    const badge = document.getElementById(`sep-badge-${catKey}`);
    if (badge) badge.textContent = `${state.uniqueValues.length} unique`;

    renderAllSeparatePreviews();
    saveSeparateSessionToStorage();
    showToast(`Split "${uniqueVal}" removed from ${catKey.toUpperCase()}.`, "info");
}

// Inspect first 50 rows of a split group in sheet inspector
async function inspectSeparateGroup(catKey, uniqueVal) {
    const state = sepCategoryState[catKey];
    const config = SEP_CATEGORIES[catKey];
    if (!state || !config) return;

    const dataRows = state.groups.get(uniqueVal) || [];
    let headers = [];

    if (state.aoa && state.aoa.length >= config.headerRows) {
        headers = state.aoa.slice(0, config.headerRows);
    } else if (state.file) {
        const fullAoa = await readExcelAsAOA(state.file);
        state.aoa = fullAoa;
        headers = fullAoa.slice(0, config.headerRows);
    }

    const sampleAOA = [...headers, ...dataRows.slice(0, 50)];
    openRenFileInspector({
        name: `${uniqueVal} (${config.name})`,
        parsedAOA: sampleAOA,
        fileObj: null
    });
}

// Move SIMPLE splits directly to Folder Create Tab
async function moveSimpleToFolderCreate() {
    const state = sepCategoryState.simple;
    const config = SEP_CATEGORIES.simple;

    if (!state || !state.file || state.uniqueValues.length === 0) {
        showToast("No Simple split files available to move.", "error");
        return;
    }

    const sepProgress = document.getElementById('sep-progress');
    const sepProgressPercent = document.getElementById('sep-progress-percent');
    const sepProgressText = document.getElementById('sep-progress-text');
    const sepProgressFill = document.getElementById('sep-progress-fill');

    if (sepProgress) sepProgress.classList.remove('hidden');
    const updateProgress = (pct, txt) => {
        if (sepProgressPercent) sepProgressPercent.textContent = `${Math.round(pct)}%`;
        if (sepProgressFill) sepProgressFill.style.width = `${pct}%`;
        if (sepProgressText) sepProgressText.textContent = txt;
    };

    updateProgress(15, "Generating Simple split Excel files for Folder Create...");
    await new Promise(r => setTimeout(r, 40));

    try {
        let headers = [];
        if (state.aoa && state.aoa.length >= config.headerRows) {
            headers = state.aoa.slice(0, config.headerRows);
        } else {
            const fullAoa = await readExcelAsAOA(state.file);
            state.aoa = fullAoa;
            headers = fullAoa.slice(0, config.headerRows);
        }

        const dtStamp = getDtStamp();
        const splitFilesForFolder = [];

        for (let i = 0; i < state.uniqueValues.length; i++) {
            const val = state.uniqueValues[i];
            const dataRows = state.groups.get(val) || [];

            const pct = 15 + Math.round((i / state.uniqueValues.length) * 75);
            updateProgress(pct, `Packaging: ${val} (${i + 1}/${state.uniqueValues.length})...`);
            await new Promise(r => setTimeout(r, 10));

            const outputRows = [...headers, ...dataRows];
            const ws = XLSX.utils.aoa_to_sheet(outputRows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

            const arrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const outputName = cleanFileNameString(`${val}${config.suffix}`);
            const finalName = `${outputName} ${dtStamp}_${String(i + 1).padStart(2, '0')}.xlsx`;

            const fileObj = new File([arrayBuffer], finalName, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            splitFilesForFolder.push(fileObj);
        }

        updateProgress(100, "Done!");
        setTimeout(() => {
            if (sepProgress) sepProgress.classList.add('hidden');
        }, 800);

        // Pass files to Folder Create
        handleFldFileSelection(splitFilesForFolder);

        // Switch to Folder Create Tab
        const folderTabBtn = document.getElementById('btn-folder-create-tab') || document.querySelector('.tab-btn[data-tab="tab-folder-create"]');
        if (folderTabBtn) folderTabBtn.click();

        showToast(`${splitFilesForFolder.length} Simple split files transferred to Folder Create tab!`, "success");

    } catch (err) {
        console.error(err);
        if (sepProgress) sepProgress.classList.add('hidden');
        showToast("Error moving Simple splits to Folder Create: " + err.message, "error");
    }
}

// Download ZIP for a specific category or All categories
async function downloadSeparateZip(category = 'all') {
    const catsToZip = (category === 'all')
        ? Object.keys(SEP_CATEGORIES)
        : [category];

    const totalUniqueCount = catsToZip.reduce((sum, k) => sum + (sepCategoryState[k] ? sepCategoryState[k].uniqueValues.length : 0), 0);

    if (totalUniqueCount === 0) {
        showToast("No split files available to download.", "error");
        return;
    }

    const sepProgress = document.getElementById('sep-progress');
    const sepProgressPercent = document.getElementById('sep-progress-percent');
    const sepProgressText = document.getElementById('sep-progress-text');
    const sepProgressFill = document.getElementById('sep-progress-fill');

    if (sepProgress) sepProgress.classList.remove('hidden');
    const updateProgress = (pct, txt) => {
        if (sepProgressPercent) sepProgressPercent.textContent = `${Math.round(pct)}%`;
        if (sepProgressFill) sepProgressFill.style.width = `${pct}%`;
        if (sepProgressText) sepProgressText.textContent = txt;
    };

    updateProgress(10, "Building ZIP archive...");
    await new Promise(r => setTimeout(r, 40));

    try {
        const zip = new JSZip();
        const dtStamp = getDtStamp();
        let processedCount = 0;

        for (const catKey of catsToZip) {
            const state = sepCategoryState[catKey];
            const config = SEP_CATEGORIES[catKey];
            if (!state || !state.file || state.uniqueValues.length === 0) continue;

            let headers = [];
            if (state.aoa && state.aoa.length >= config.headerRows) {
                headers = state.aoa.slice(0, config.headerRows);
            } else {
                const fullAoa = await readExcelAsAOA(state.file);
                state.aoa = fullAoa;
                headers = fullAoa.slice(0, config.headerRows);
            }

            for (let i = 0; i < state.uniqueValues.length; i++) {
                const val = state.uniqueValues[i];
                const dataRows = state.groups.get(val) || [];

                processedCount++;
                const pct = 10 + Math.round((processedCount / totalUniqueCount) * 80);
                updateProgress(pct, `Packaging [${config.name}]: ${val}...`);
                await new Promise(r => setTimeout(r, 5));

                const outputRows = [...headers, ...dataRows];
                const ws = XLSX.utils.aoa_to_sheet(outputRows);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

                const arrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                let outputName = "";
                if (catKey === 'tax') {
                    const firstNum = val.split('-')[0] || val;
                    outputName = `${firstNum}-Tax-${val}-MYNTYRA`;
                } else {
                    outputName = `${val}${config.suffix}`;
                }
                outputName = cleanFileNameString(outputName);
                const finalName = `${outputName} ${dtStamp}_${String(i + 1).padStart(2, '0')}.xlsx`;

                const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                
                if (category === 'all' && catsToZip.length > 1) {
                    zip.folder(config.name).file(finalName, blob);
                } else {
                    zip.file(finalName, blob);
                }
            }
        }

        updateProgress(95, "Generating ZIP file...");
        await new Promise(r => setTimeout(r, 40));

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipFileName = (category === 'all')
            ? "myntra_all_separate_bundle.zip"
            : (SEP_CATEGORIES[category]?.zipName || "myntra_separate.zip");

        updateProgress(100, "Downloading!");

        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = zipFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => {
            URL.revokeObjectURL(url);
            if (sepProgress) {
                sepProgress.classList.add('hidden');
                if (sepProgressPercent) sepProgressPercent.textContent = "0%";
                if (sepProgressFill) sepProgressFill.style.width = "0%";
            }
        }, 1200);

        showToast(`${zipFileName} downloaded successfully!`, "success");

    } catch (err) {
        console.error(err);
        if (sepProgress) sepProgress.classList.add('hidden');
        showToast("Error generating ZIP: " + err.message, "error");
    }
}

// Open Full View Modal for Separate Tab
function openSepFullViewModal(category = 'all') {
    sepFullviewCategory = category;
    const modal = document.getElementById('sep-fullview-modal');
    const searchInput = document.getElementById('sep-fullview-search');

    if (!modal) return;
    if (searchInput) searchInput.value = '';

    // Update active category filter button
    document.querySelectorAll('.sep-filter-btn').forEach(btn => {
        if (btn.getAttribute('data-category') === category) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    renderSepFullViewModalRows();
    modal.classList.add('show');
    modal.classList.remove('hidden');
}

function closeSepFullViewModal() {
    const modal = document.getElementById('sep-fullview-modal');
    if (modal) {
        modal.classList.remove('show');
        modal.classList.add('hidden');
    }
}

function renderSepFullViewModalRows() {
    const tbody = document.getElementById('tbody-sep-fullview-files');
    const countTag = document.getElementById('sep-fullview-count');
    const searchInput = document.getElementById('sep-fullview-search');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

    if (!tbody) return;
    tbody.innerHTML = '';

    const list = [];
    const cats = (sepFullviewCategory === 'all') ? Object.keys(SEP_CATEGORIES) : [sepFullviewCategory];
    const dtStampPlaceholder = getDtStamp();

    cats.forEach(catKey => {
        const state = sepCategoryState[catKey];
        const config = SEP_CATEGORIES[catKey];
        if (state && state.file && state.uniqueValues.length > 0) {
            state.uniqueValues.forEach((val, idx) => {
                const rows = state.groups.get(val) || [];
                let outputName = "";
                if (catKey === 'tax') {
                    const firstNum = val.split('-')[0] || val;
                    outputName = `${firstNum}-Tax-${val}-MYNTYRA`;
                } else {
                    outputName = `${val}${config.suffix}`;
                }
                outputName = cleanFileNameString(outputName);
                const displayFilename = `${outputName} ${dtStampPlaceholder}_${String(idx + 1).padStart(2, '0')}.xlsx`;

                if (!query || val.toLowerCase().includes(query) || displayFilename.toLowerCase().includes(query) || config.name.toLowerCase().includes(query)) {
                    list.push({
                        catKey: catKey,
                        categoryName: config.name,
                        badgeClass: config.badgeClass,
                        val: val,
                        rowCount: rows.length,
                        filename: displayFilename
                    });
                }
            });
        }
    });

    if (countTag) countTag.textContent = `${list.length} unique values`;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No matching split files found.</td></tr>`;
        return;
    }

    list.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.className = `row-color-${idx % 7}`;
        tr.innerHTML = `
            <td><strong>${idx + 1}</strong></td>
            <td><span class="badge ${item.badgeClass}" style="font-weight: 700;">${item.categoryName}</span></td>
            <td><span style="font-family: monospace; font-weight: 700; color: var(--text-primary); font-size: 0.78rem;">${item.val}</span></td>
            <td><span class="badge ${item.badgeClass}">${item.rowCount} rows</span></td>
            <td><span style="color: var(--primary); font-weight: 500; font-size: 0.76rem;">${item.filename}</span></td>
            <td style="text-align: center;">
                <div style="display: inline-flex; gap: 4px;">
                    <button class="btn-action btn-inspect-split" title="Inspect first 50 rows" style="width: 24px; height: 24px; border-radius: 6px; border: none; background: rgba(124, 58, 237, 0.08); color: var(--primary); cursor: pointer;">
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    </button>
                    <button class="btn-action btn-del-split" title="Delete this split group" style="width: 24px; height: 24px; border-radius: 6px; border: none; background: rgba(220, 38, 38, 0.08); color: var(--color-danger); cursor: pointer;">
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </td>
        `;

        const btnInspect = tr.querySelector('.btn-inspect-split');
        if (btnInspect) {
            btnInspect.addEventListener('click', () => inspectSeparateGroup(item.catKey, item.val));
        }

        const btnDel = tr.querySelector('.btn-del-split');
        if (btnDel) {
            btnDel.addEventListener('click', () => {
                showDeleteConfirmation({
                    title: `Delete "${item.val}" Split?`,
                    message: `Are you sure you want to delete "${item.val}" from ${item.categoryName}?`,
                    onConfirm: () => removeSepGroup(item.catKey, item.val)
                });
            });
        }

        tbody.appendChild(tr);
    });
}

// Helper to extract valid spreadsheet files from a ZIP Blob
async function extractSpreadsheetsFromZip(zipFile) {
    const zip = await JSZip.loadAsync(zipFile);
    const promises = [];
    const filesFound = [];
    
    const zipName = zipFile.name;
    const zipDigitsMatch = zipName.match(/\d+/);
    const zipDigits = zipDigitsMatch ? zipDigitsMatch[0] : null;
    const zipBaseName = zipName.substring(0, zipName.lastIndexOf('.')) || zipName;
    
    zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
            const parts = zipEntry.name.split('.');
            const ext = parts.length > 1 ? parts.pop().toLowerCase() : '';
            if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
                const promise = zipEntry.async("blob").then((blob) => {
                    const filename = zipEntry.name.split('/').pop();
                    
                    let adjustedPath = relativePath;
                    const pathParts = relativePath.split('/');
                    let hasNumericFolder = false;
                    for (let i = 0; i < pathParts.length - 1; i++) {
                        if (/^\d+/.test(pathParts[i])) {
                            hasNumericFolder = true;
                            break;
                        }
                    }
                    if (!hasNumericFolder) {
                        const prefix = zipDigits || zipBaseName;
                        adjustedPath = `${prefix}/${relativePath}`;
                    }
                    
                    filesFound.push({
                        name: filename,
                        path: adjustedPath,
                        ext: ext,
                        blob: blob
                    });
                });
                promises.push(promise);
            }
        }
    });
    
    await Promise.all(promises);
    return filesFound;
}

// ==========================================
// RENAME FILE TAB OPERATIONS
// ==========================================

// State Variables for Rename File tab
let renUploadedFiles = []; // Array of { id, name, fileObj, ext, methodType, renameCode, renamedName, p2Value, colGValue, parsedAOA }
let renIsProcessed = false; // Tracks if user has clicked "Rename All Files"
let renGeneratedZipBlob = null;
let renGeneratedZipName = "";
let renNextId = 1;
let renActiveEditFile = null;
let renFullviewCategory = 'all'; // 'all', 'p2', or 'g'
let renSessionTimerInterval = null;

// IndexedDB Session Storage Config (1 Hour Expiry)
const REN_DB_NAME = 'MyntraRenameCacheDB';
const REN_DB_STORE = 'renameSession';
const REN_DB_VERSION = 1;
const REN_SESSION_EXPIRY_MS = 60 * 60 * 1000; // 1 Hour in ms

function openRenameDB() {
    return new Promise((resolve) => {
        if (!window.indexedDB) {
            resolve(null);
            return;
        }
        try {
            const req = indexedDB.open(REN_DB_NAME, REN_DB_VERSION);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(REN_DB_STORE)) {
                    db.createObjectStore(REN_DB_STORE, { keyPath: 'id' });
                }
            };
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = () => resolve(null);
        } catch (e) {
            resolve(null);
        }
    });
}

async function saveRenameSessionToStorage() {
    try {
        const db = await openRenameDB();
        if (!db) return;
        
        if (renUploadedFiles.length === 0) {
            const tx = db.transaction([REN_DB_STORE], 'readwrite');
            tx.objectStore(REN_DB_STORE).delete('currentSession');
            hideSessionBanner();
            return;
        }

        const serializedFiles = renUploadedFiles.map(f => ({
            id: f.id,
            name: f.name,
            originalSourceFileName: f.originalSourceFileName || f.name,
            ext: f.ext,
            methodType: f.methodType,
            warehouseId: f.warehouseId || null,
            isSplit: !!f.isSplit,
            splitIndex: f.splitIndex || null,
            totalSplits: f.totalSplits || 1,
            rowCount: f.rowCount || 0,
            p2Value: f.p2Value,
            colGValue: f.colGValue,
            renameCode: f.renameCode,
            renamedName: f.renamedName,
            parsedAOA: f.parsedAOA ? f.parsedAOA.slice(0, 50) : null,
            blob: f.fileObj // Blob stored directly in IndexedDB
        }));

        const expiresAt = Date.now() + REN_SESSION_EXPIRY_MS;
        const sessionData = {
            id: 'currentSession',
            timestamp: Date.now(),
            expiresAt: expiresAt,
            isProcessed: renIsProcessed,
            files: serializedFiles
        };

        const tx = db.transaction([REN_DB_STORE], 'readwrite');
        tx.objectStore(REN_DB_STORE).put(sessionData);
        startSessionTimer(expiresAt);
    } catch (err) {
        console.warn("IndexedDB save error:", err);
    }
}

async function loadRenameSessionFromStorage() {
    try {
        const db = await openRenameDB();
        if (!db) return;

        const tx = db.transaction([REN_DB_STORE], 'readonly');
        const store = tx.objectStore(REN_DB_STORE);
        const req = store.get('currentSession');

        req.onsuccess = async () => {
            const data = req.result;
            if (!data) return;

            const now = Date.now();
            if (now > data.expiresAt) {
                // Expired (1 hour passed) -> clear from DB
                clearRenameSessionStorage();
                return;
            }

            // Restore files into renUploadedFiles
            if (data.files && data.files.length > 0) {
                renUploadedFiles = data.files.map(f => {
                    let fileObj = f.blob;
                    if (f.blob && !(f.blob instanceof Blob)) {
                        fileObj = new Blob([f.blob]);
                    }
                    return {
                        id: f.id,
                        name: f.name,
                        originalSourceFileName: f.originalSourceFileName || f.name,
                        fileObj: fileObj,
                        ext: f.ext,
                        methodType: f.methodType || 'p2',
                        warehouseId: f.warehouseId || null,
                        isSplit: !!f.isSplit,
                        splitIndex: f.splitIndex || null,
                        totalSplits: f.totalSplits || 1,
                        rowCount: f.rowCount || 0,
                        p2Value: f.p2Value || '',
                        colGValue: f.colGValue || '',
                        renameCode: f.renameCode || '',
                        renamedName: f.renamedName || f.name,
                        parsedAOA: f.parsedAOA || null
                    };
                });

                renIsProcessed = !!data.isProcessed;
                renNextId = Math.max(...renUploadedFiles.map(f => f.id), 0) + 1;
                updateRenUploadBadges();
                renderRenameState();
                startSessionTimer(data.expiresAt);
                showToast(`Restored ${renUploadedFiles.length} files from 1-hour session!`, "info");
            }
        };
    } catch (err) {
        console.warn("IndexedDB load error:", err);
    }
}

async function clearRenameSessionStorage() {
    try {
        const db = await openRenameDB();
        if (!db) return;
        const tx = db.transaction([REN_DB_STORE], 'readwrite');
        tx.objectStore(REN_DB_STORE).delete('currentSession');
        hideSessionBanner();
    } catch (err) {
        console.warn("IndexedDB clear error:", err);
    }
}

function startSessionTimer(expiresAt) {
    const banner = document.getElementById('ren-session-banner');
    const timerElem = document.getElementById('ren-session-timer');
    if (!banner || !timerElem) return;

    banner.classList.remove('hidden');

    if (renSessionTimerInterval) clearInterval(renSessionTimerInterval);

    const updateTimer = () => {
        const remainingMs = expiresAt - Date.now();
        if (remainingMs <= 0) {
            timerElem.textContent = "Session expired";
            clearInterval(renSessionTimerInterval);
            clearRenameSessionStorage();
            return;
        }
        const mins = Math.floor(remainingMs / (60 * 1000));
        const secs = Math.floor((remainingMs % (60 * 1000)) / 1000);
        timerElem.textContent = `Auto-clears in ${mins}m ${secs}s`;
    };

    updateTimer();
    renSessionTimerInterval = setInterval(updateTimer, 1000);
}

function hideSessionBanner() {
    const banner = document.getElementById('ren-session-banner');
    if (banner) banner.classList.add('hidden');
    if (renSessionTimerInterval) {
        clearInterval(renSessionTimerInterval);
        renSessionTimerInterval = null;
    }
}

function setupRenameFile() {
    // P2 Elements
    const renDropzoneP2 = document.getElementById('ren-dropzone-p2');
    const renFileInputP2 = document.getElementById('ren-file-input-p2');
    const btnRenP2Select = document.getElementById('btn-ren-p2-select');
    const btnRenP2Clear = document.getElementById('btn-ren-p2-clear');

    // Column G Elements
    const renDropzoneG = document.getElementById('ren-dropzone-g');
    const renFileInputG = document.getElementById('ren-file-input-g');
    const btnRenGSelect = document.getElementById('btn-ren-g-select');
    const btnRenGClear = document.getElementById('btn-ren-g-clear');

    // Action Buttons
    const btnRenameRun = document.getElementById('btn-rename-run');
    const btnRenameRunTrigger = document.getElementById('btn-rename-run-trigger');
    const btnDownloadAllZip = document.getElementById('btn-download-all-zip');
    const btnDownloadOrderZip = document.getElementById('btn-download-order-zip');
    const btnMoveToMerge = document.getElementById('btn-move-to-merge');
    const btnOrderFullview = document.getElementById('btn-order-fullview');

    const btnDownloadTaxZip = document.getElementById('btn-download-tax-zip');
    const btnMoveToFolderCreate = document.getElementById('btn-move-to-folder-create');
    const btnTaxFullview = document.getElementById('btn-tax-fullview');

    // Edit Prefix Modal Elements
    const editPrefixModal = document.getElementById('edit-prefix-modal');
    const btnCloseEditPrefix = document.getElementById('btn-close-edit-prefix');
    const btnCancelEditPrefix = document.getElementById('btn-cancel-edit-prefix');
    const btnSaveEditPrefix = document.getElementById('btn-save-edit-prefix');
    const editPrefixInput = document.getElementById('edit-prefix-input');

    // Full View Modal Elements
    const renFullviewModal = document.getElementById('ren-fullview-modal');
    const btnCloseRenFullview = document.getElementById('btn-close-ren-fullview');
    const renFullviewSearch = document.getElementById('ren-fullview-search');

    // Setup P2 Upload & Dropzone
    if (renDropzoneP2 && renFileInputP2) {
        renDropzoneP2.addEventListener('click', (e) => {
            if (e.target.closest('#btn-ren-p2-select') || e.target.closest('#btn-ren-p2-clear')) return;
            renFileInputP2.click();
        });

        if (btnRenP2Select) {
            btnRenP2Select.addEventListener('click', (e) => {
                e.stopPropagation();
                renFileInputP2.click();
            });
        }

        renFileInputP2.addEventListener('change', (e) => {
            handleRenFileSelection(e.target.files, 'p2');
            renFileInputP2.value = "";
        });

        renDropzoneP2.addEventListener('dragover', (e) => {
            e.preventDefault();
            renDropzoneP2.classList.add('dragover');
        });

        renDropzoneP2.addEventListener('dragleave', () => {
            renDropzoneP2.classList.remove('dragover');
        });

        renDropzoneP2.addEventListener('drop', (e) => {
            e.preventDefault();
            renDropzoneP2.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                handleRenFileSelection(e.dataTransfer.files, 'p2');
            }
        });
    }

    // Setup Column G Upload & Dropzone
    if (renDropzoneG && renFileInputG) {
        renDropzoneG.addEventListener('click', (e) => {
            if (e.target.closest('#btn-ren-g-select') || e.target.closest('#btn-ren-g-clear')) return;
            renFileInputG.click();
        });

        if (btnRenGSelect) {
            btnRenGSelect.addEventListener('click', (e) => {
                e.stopPropagation();
                renFileInputG.click();
            });
        }

        renFileInputG.addEventListener('change', (e) => {
            handleRenFileSelection(e.target.files, 'g');
            renFileInputG.value = "";
        });

        renDropzoneG.addEventListener('dragover', (e) => {
            e.preventDefault();
            renDropzoneG.classList.add('dragover');
        });

        renDropzoneG.addEventListener('dragleave', () => {
            renDropzoneG.classList.remove('dragover');
        });

        renDropzoneG.addEventListener('drop', (e) => {
            e.preventDefault();
            renDropzoneG.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                handleRenFileSelection(e.dataTransfer.files, 'g');
            }
        });
    }

    // Clear individual sections
    if (btnRenP2Clear) {
        btnRenP2Clear.addEventListener('click', (e) => {
            e.stopPropagation();
            clearRenMethodFiles('p2');
        });
    }

    if (btnRenGClear) {
        btnRenGClear.addEventListener('click', (e) => {
            e.stopPropagation();
            clearRenMethodFiles('g');
        });
    }

    // Rename Trigger (Execute Rename Algorithm on button click)
    if (btnRenameRun) btnRenameRun.addEventListener('click', processRenameAction);
    if (btnRenameRunTrigger) btnRenameRunTrigger.addEventListener('click', processRenameAction);

    // Download ZIP Actions (NO auto download - user clicks button when ready)
    if (btnDownloadAllZip) btnDownloadAllZip.addEventListener('click', () => downloadRenZip('all'));
    if (btnDownloadOrderZip) btnDownloadOrderZip.addEventListener('click', () => downloadRenZip('p2'));
    if (btnDownloadTaxZip) btnDownloadTaxZip.addEventListener('click', () => downloadRenZip('g'));

    // Move to Tab Actions
    if (btnMoveToMerge) btnMoveToMerge.addEventListener('click', moveToMergeTab);
    if (btnMoveToFolderCreate) btnMoveToFolderCreate.addEventListener('click', moveToFolderCreateTab);

    // Full View Modal Triggers
    if (btnOrderFullview) {
        btnOrderFullview.addEventListener('click', () => openRenFullViewModal('p2'));
    }
    if (btnTaxFullview) {
        btnTaxFullview.addEventListener('click', () => openRenFullViewModal('g'));
    }

    // Edit Prefix Modal Handlers
    if (btnCloseEditPrefix) btnCloseEditPrefix.addEventListener('click', closeEditPrefixModal);
    if (btnCancelEditPrefix) btnCancelEditPrefix.addEventListener('click', closeEditPrefixModal);
    if (btnSaveEditPrefix) btnSaveEditPrefix.addEventListener('click', saveEditPrefix);
    if (editPrefixInput) {
        editPrefixInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') saveEditPrefix();
            if (e.key === 'Escape') closeEditPrefixModal();
        });
    }
    if (editPrefixModal) {
        editPrefixModal.addEventListener('click', (e) => {
            if (e.target === editPrefixModal) closeEditPrefixModal();
        });
    }

    // Full View Modal Handlers
    if (btnCloseRenFullview) {
        btnCloseRenFullview.addEventListener('click', () => {
            if (renFullviewModal) renFullviewModal.classList.remove('show');
        });
    }
    if (renFullviewModal) {
        renFullviewModal.addEventListener('click', (e) => {
            if (e.target === renFullviewModal) renFullviewModal.classList.remove('show');
        });
    }
    if (renFullviewSearch) {
        renFullviewSearch.addEventListener('input', () => {
            renderFullViewModalRows();
        });
    }

    // Load saved 1-hour session from IndexedDB if available
    loadRenameSessionFromStorage();
}

// Clear files belonging to a specific method (p2 or g)
function clearRenMethodFiles(methodType) {
    renUploadedFiles = renUploadedFiles.filter(f => f.methodType !== methodType);
    if (renUploadedFiles.length === 0) {
        renIsProcessed = false;
    }
    resetRenameButtonState();
    updateRenUploadBadges();
    if (renIsProcessed) {
        calculateRenameResults();
    }
    renderRenameState();
    saveRenameSessionToStorage();
    showToast(`Cleared ${methodType === 'p2' ? 'Order' : 'Tax'} files.`, "info");
}

// Update file count badges on upload boxes
function updateRenUploadBadges() {
    const p2Files = renUploadedFiles.filter(f => f.methodType === 'p2');
    const gFiles = renUploadedFiles.filter(f => f.methodType === 'g');

    const renP2Badge = document.getElementById('ren-p2-count-badge');
    const renGBadge = document.getElementById('ren-g-count-badge');
    const renFileLabelP2 = document.getElementById('ren-file-label-p2');
    const renFileLabelG = document.getElementById('ren-file-label-g');
    const btnRenP2Clear = document.getElementById('btn-ren-p2-clear');
    const btnRenGClear = document.getElementById('btn-ren-g-clear');

    if (renP2Badge) renP2Badge.textContent = `${p2Files.length} file${p2Files.length === 1 ? '' : 's'}`;
    if (renGBadge) renGBadge.textContent = `${gFiles.length} file${gFiles.length === 1 ? '' : 's'}`;

    if (renFileLabelP2) {
        renFileLabelP2.textContent = p2Files.length > 0 ? `${p2Files.length} P2 file${p2Files.length === 1 ? '' : 's'} loaded` : "Drop P2 Files / ZIP here";
    }
    if (renFileLabelG) {
        renFileLabelG.textContent = gFiles.length > 0 ? `${gFiles.length} Column G file${gFiles.length === 1 ? '' : 's'} loaded` : "Drop Column G Files / ZIP here";
    }

    if (btnRenP2Clear) btnRenP2Clear.style.display = p2Files.length > 0 ? "inline-block" : "none";
    if (btnRenGClear) btnRenGClear.style.display = gFiles.length > 0 ? "inline-block" : "none";
}

// Reset rename button state
function resetRenameButtonState() {
    renGeneratedZipBlob = null;
    renGeneratedZipName = "";
    const btnRenameRun = document.getElementById('btn-rename-run');
    if (btnRenameRun) {
        btnRenameRun.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            ${renIsProcessed ? 'Re-run Rename' : 'Rename All Files'}
        `;
        btnRenameRun.style.background = "";
        btnRenameRun.style.borderColor = "";
        btnRenameRun.disabled = false;
    }
}

// Handle selected rename files
async function handleRenFileSelection(files, methodType = 'p2') {
    if (!files || files.length === 0) return;

    const renProgress = document.getElementById('ren-progress');
    const renProgressPercent = document.getElementById('ren-progress-percent');
    const renProgressText = document.getElementById('ren-progress-text');
    const renProgressFill = document.getElementById('ren-progress-fill');

    if (renProgress) renProgress.classList.remove('hidden');
    const updateRenProgress = (percent, text) => {
        if (renProgressPercent) renProgressPercent.textContent = `${Math.round(percent)}%`;
        if (renProgressFill) renProgressFill.style.width = `${percent}%`;
        if (renProgressText && text) renProgressText.textContent = text;
    };

    updateRenProgress(5, `Loading ${methodType === 'p2' ? 'Order (P2)' : 'Tax (Column G)'} files...`);

    try {
        const flatFilesList = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const ext = file.name.split('.').pop().toLowerCase();
            
            if (ext === 'zip') {
                updateRenProgress(10, `Extracting ZIP: ${file.name}...`);
                const extracted = await extractSpreadsheetsFromZip(file);
                flatFilesList.push(...extracted);
            } else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
                flatFilesList.push({
                    name: file.name,
                    ext: ext,
                    blob: file
                });
            }
        }

        if (flatFilesList.length === 0) {
            if (renProgress) renProgress.classList.add('hidden');
            showToast("No valid Excel or CSV files found.", "error");
            return;
        }

        for (let i = 0; i < flatFilesList.length; i++) {
            const fileData = flatFilesList[i];
            const fileProgress = 10 + Math.round((i / flatFilesList.length) * 80);
            updateRenProgress(fileProgress, `Reading: ${fileData.name}...`);
            await new Promise(r => setTimeout(r, 8));

            const fileObj = {
                id: renNextId++,
                name: fileData.name,
                fileObj: fileData.blob,
                ext: fileData.ext,
                methodType: methodType, // 'p2' or 'g'
                p2Value: "",
                colGValue: "",
                renameCode: "",
                renamedName: "",
                parsedAOA: null
            };

            const aoa = await readExcelAsAOA(fileData.blob);
            
            if (methodType === 'p2') {
                // P2 / ORDER FILES: Check Column B (Warehouse ID) for multi-warehouse splitting
                let whColIdx = 1; // Default Column B (index 1)
                if (aoa && aoa.length > 0 && Array.isArray(aoa[0])) {
                    for (let c = 0; c < aoa[0].length; c++) {
                        const h = String(aoa[0][c] || '').trim().toLowerCase();
                        if (h.includes('warehouse') || h === 'wh id' || h === 'wh_id') {
                            whColIdx = c;
                            break;
                        }
                    }
                }

                // Group data rows by unique Warehouse ID
                const whGroups = new Map();
                for (let r = 1; r < aoa.length; r++) {
                    const row = aoa[r];
                    if (!row || row.length === 0) continue;
                    const hasData = row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '');
                    if (!hasData) continue;

                    const whId = String(row[whColIdx] !== undefined && row[whColIdx] !== null ? row[whColIdx] : '').trim();
                    const key = whId !== '' ? whId : 'Unknown_WH';
                    if (!whGroups.has(key)) whGroups.set(key, []);
                    whGroups.get(key).push(row);
                }

                const uniqueWhIds = Array.from(whGroups.keys());

                if (uniqueWhIds.length > 1) {
                    // MULTIPLE WAREHOUSE IDs -> Split into separate files: -1, -2, -3 ...
                    const lastDot = fileData.name.lastIndexOf('.');
                    const origBaseName = lastDot !== -1 ? fileData.name.substring(0, lastDot) : fileData.name;
                    const ext = fileData.ext || 'xlsx';

                    for (let idx = 0; idx < uniqueWhIds.length; idx++) {
                        const whId = uniqueWhIds[idx];
                        const splitNum = idx + 1;
                        const splitFileName = `${origBaseName}-${splitNum}.${ext}`;
                        const matchingRows = whGroups.get(whId);
                        const splitAoa = [aoa[0], ...matchingRows];

                        // Extract P2 value for this split (row 1, column 15 / Column P)
                        let p2Val = "";
                        if (splitAoa.length > 1 && splitAoa[1] && splitAoa[1][15] !== undefined) {
                            p2Val = String(splitAoa[1][15]).trim();
                        }

                        // Generate independent XLSX workbook Blob for this split
                        const ws = XLSX.utils.aoa_to_sheet(splitAoa);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
                        const arrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                        const splitBlob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

                        renUploadedFiles.push({
                            id: renNextId++,
                            name: splitFileName,
                            originalSourceFileName: fileData.name,
                            fileObj: splitBlob,
                            ext: ext,
                            methodType: 'p2',
                            warehouseId: whId,
                            isSplit: true,
                            splitIndex: splitNum,
                            totalSplits: uniqueWhIds.length,
                            rowCount: matchingRows.length,
                            p2Value: p2Val,
                            colGValue: "",
                            renameCode: "",
                            renamedName: "",
                            parsedAOA: splitAoa.slice(0, 50)
                        });
                    }
                } else {
                    // SINGLE WAREHOUSE ID -> Keep original file without splitting or -1 suffix
                    let p2Val = "";
                    if (aoa.length > 1 && aoa[1] && aoa[1][15] !== undefined) {
                        p2Val = String(aoa[1][15]).trim();
                    }
                    const singleWhId = uniqueWhIds[0] || "";

                    renUploadedFiles.push({
                        id: renNextId++,
                        name: fileData.name,
                        originalSourceFileName: fileData.name,
                        fileObj: fileData.blob,
                        ext: fileData.ext,
                        methodType: 'p2',
                        warehouseId: singleWhId,
                        isSplit: false,
                        splitIndex: null,
                        totalSplits: 1,
                        rowCount: Math.max(0, aoa.length - 1),
                        p2Value: p2Val,
                        colGValue: "",
                        renameCode: "",
                        renamedName: "",
                        parsedAOA: aoa ? aoa.slice(0, 50) : null
                    });
                }
            } else {
                // COLUMN G METHOD (TAX FILES)
                let colGVal = "";
                for (let r = 1; r < aoa.length; r++) {
                    const row = aoa[r];
                    if (row && row[6] !== undefined && row[6] !== null) {
                        const val = String(row[6]).trim();
                        const lowerVal = val.toLowerCase();
                        if (val !== "" && lowerVal !== "quantity" && lowerVal !== "description" && lowerVal !== "invoice number" && lowerVal !== "seller sku") {
                            colGVal = val;
                            break;
                        }
                    }
                }

                // Fallback: If Column G (index 6) was empty, scan rows 1..25 across columns 0..15
                if (!colGVal) {
                    for (let r = 1; r < Math.min(aoa.length, 25); r++) {
                        const row = aoa[r];
                        if (!row) continue;
                        for (let c = 0; c < Math.min(row.length, 15); c++) {
                            if (row[c] !== undefined && row[c] !== null) {
                                const val = String(row[c]).trim();
                                const upperVal = val.toUpperCase();
                                if (val !== "" && (upperVal.startsWith("CGJ1-") || val.includes('-') || /\d{2,4}/.test(val))) {
                                    const lowerVal = val.toLowerCase();
                                    if (!lowerVal.includes("invoice") && !lowerVal.includes("order") && !lowerVal.includes("description") && !lowerVal.includes("quantity")) {
                                        colGVal = val;
                                        break;
                                    }
                                }
                            }
                        }
                        if (colGVal) break;
                    }
                }

                renUploadedFiles.push({
                    id: renNextId++,
                    name: fileData.name,
                    originalSourceFileName: fileData.name,
                    fileObj: fileData.blob,
                    ext: fileData.ext,
                    methodType: 'g',
                    warehouseId: null,
                    isSplit: false,
                    splitIndex: null,
                    totalSplits: 1,
                    rowCount: Math.max(0, aoa.length - 1),
                    p2Value: "",
                    colGValue: colGVal,
                    renameCode: "",
                    renamedName: "",
                    parsedAOA: aoa ? aoa.slice(0, 50) : null
                });
            }
        }

        // New files added -> Needs processing by user clicking "Rename All Files"
        renIsProcessed = false;
        resetRenameButtonState();
        updateRenUploadBadges();
        renderRenameState();
        saveRenameSessionToStorage();

        updateRenProgress(100, "Loaded!");
        showToast(`${flatFilesList.length} ${methodType === 'p2' ? 'Order' : 'Tax'} file(s) processed & loaded! Click 'Process & Rename All Files' to rename.`, "info");
        
        setTimeout(() => {
            if (renProgress) {
                renProgress.classList.add('hidden');
                if (renProgressPercent) renProgressPercent.textContent = "0%";
                if (renProgressFill) renProgressFill.style.width = "0%";
                if (renProgressText) renProgressText.textContent = "Processing rename...";
            }
        }, 1000);

    } catch (err) {
        console.error(err);
        showToast("Error reading files: " + err.message, "error");
        if (renProgress) renProgress.classList.add('hidden');
    }
}

// Process Rename Action: Triggered only when clicking "Rename All Files" button!
async function processRenameAction() {
    if (renUploadedFiles.length === 0) {
        showToast("Please upload files to P2 or Column G first.", "error");
        return;
    }

    const btnRenameRun = document.getElementById('btn-rename-run');
    const renProgress = document.getElementById('ren-progress');
    const renProgressPercent = document.getElementById('ren-progress-percent');
    const renProgressText = document.getElementById('ren-progress-text');
    const renProgressFill = document.getElementById('ren-progress-fill');

    if (btnRenameRun) btnRenameRun.disabled = true;
    if (renProgress) renProgress.classList.remove('hidden');

    const updateRenProgress = (percent, text) => {
        if (renProgressPercent) renProgressPercent.textContent = `${Math.round(percent)}%`;
        if (renProgressFill) renProgressFill.style.width = `${percent}%`;
        if (renProgressText && text) renProgressText.textContent = text;
    };

    updateRenProgress(20, "Resolving party prefixes & calculating renamed names...");
    await new Promise(r => setTimeout(r, 100));

    calculateRenameResults();
    renIsProcessed = true;
    
    updateRenProgress(80, "Organizing Order and Tax categories...");
    await new Promise(r => setTimeout(r, 100));

    renderRenameState();
    saveRenameSessionToStorage();

    updateRenProgress(100, "Rename Complete!");
    showToast(`Successfully renamed ${renUploadedFiles.length} files! You can now review or download below.`, "success");

    setTimeout(() => {
        if (renProgress) {
            renProgress.classList.add('hidden');
            if (renProgressPercent) renProgressPercent.textContent = "0%";
            if (renProgressFill) renProgressFill.style.width = "0%";
            if (renProgressText) renProgressText.textContent = "Processing rename...";
        }
        resetRenameButtonState();
    }, 1200);
}

// Render Master Rename State (Empty, Staged, or Processed Results)
function renderRenameState() {
    const emptyState = document.getElementById('ren-empty-state');
    const stagedState = document.getElementById('ren-staged-state');
    const resultsContainer = document.getElementById('ren-results-container');
    const btnRenameRun = document.getElementById('btn-rename-run');

    const stagedTitle = document.getElementById('ren-staged-title');
    const stagedDesc = document.getElementById('ren-staged-desc');

    const p2Files = renUploadedFiles.filter(f => f.methodType === 'p2');
    const gFiles = renUploadedFiles.filter(f => f.methodType === 'g');
    const totalFiles = renUploadedFiles.length;

    if (totalFiles === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (stagedState) stagedState.classList.add('hidden');
        if (resultsContainer) resultsContainer.classList.add('hidden');
        if (btnRenameRun) btnRenameRun.classList.add('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    if (!renIsProcessed) {
        // Files loaded, waiting for user to click "Rename All Files"
        if (stagedState) {
            stagedState.classList.remove('hidden');
            if (stagedTitle) stagedTitle.textContent = `${totalFiles} Files Loaded & Ready to Rename`;
            if (stagedDesc) stagedDesc.innerHTML = `Loaded: <strong>${p2Files.length} Order Files (P2)</strong> and <strong>${gFiles.length} Tax Files (Column G)</strong>. Click <strong>"Process & Rename All Files"</strong> to calculate prefix codes.`;
        }
        if (resultsContainer) resultsContainer.classList.add('hidden');
        if (btnRenameRun) {
            btnRenameRun.classList.remove('hidden');
            btnRenameRun.disabled = false;
        }
        renderStagedRenameFiles();
    } else {
        // Files processed -> Show Categorized Output Cards!
        if (stagedState) stagedState.classList.add('hidden');
        if (resultsContainer) resultsContainer.classList.remove('hidden');
        if (btnRenameRun) {
            btnRenameRun.classList.remove('hidden');
            btnRenameRun.disabled = false;
        }
        renderCategorizedRenamePreview();
    }
}

// Render Staged Files Tables (Before User Clicks Rename)
function renderStagedRenameFiles() {
    const tbodyP2 = document.getElementById('tbody-staged-order-files');
    const tbodyTax = document.getElementById('tbody-staged-tax-files');
    const badgeP2 = document.getElementById('staged-order-count-badge');
    const badgeTax = document.getElementById('staged-tax-count-badge');

    const p2Files = renUploadedFiles.filter(f => f.methodType === 'p2');
    const gFiles = renUploadedFiles.filter(f => f.methodType === 'g');

    if (badgeP2) badgeP2.textContent = `${p2Files.length} file${p2Files.length === 1 ? '' : 's'}`;
    if (badgeTax) badgeTax.textContent = `${gFiles.length} file${gFiles.length === 1 ? '' : 's'}`;

    // 1. Render P2 Order Files Table
    if (tbodyP2) {
        tbodyP2.innerHTML = '';
        if (p2Files.length === 0) {
            tbodyP2.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.2rem; font-size: 0.74rem;">No Order (P2) files loaded yet. Drop P2 files on the left.</td></tr>`;
        } else {
            p2Files.forEach((file, idx) => {
                const tr = document.createElement('tr');
                tr.className = `row-color-${idx % 7}`;
                const fileSizeFormatted = file.fileObj ? formatBytes(file.fileObj.size) : '—';
                const splitBadge = file.isSplit 
                    ? `<span class="badge" style="font-size: 0.62rem; background: rgba(124, 58, 237, 0.12); color: var(--primary); font-weight: 700; margin-left: 4px; padding: 1px 5px; border-radius: 4px;">Split ${file.splitIndex}/${file.totalSplits}</span>`
                    : '';
                const whBadge = file.warehouseId 
                    ? `<span class="badge" style="font-size: 0.65rem; background: rgba(59, 130, 246, 0.12); color: #2563eb; font-weight: 700;">🏬 ${file.warehouseId}</span>`
                    : `<span style="color: var(--text-muted); font-size: 0.7rem;">—</span>`;
                const p2Display = file.p2Value 
                    ? `<span style="font-family: monospace; font-weight: 700; color: var(--primary); font-size: 0.72rem;">${file.p2Value}</span>`
                    : `<span style="color: var(--text-muted); font-style: italic; font-size: 0.7rem;">Not detected</span>`;

                tr.innerHTML = `
                    <td style="text-align: center; font-weight: 600;">${idx + 1}</td>
                    <td>
                        <span style="font-family: monospace; font-weight: 600; color: var(--text-primary); display: inline-flex; align-items: center; gap: 4px;">
                            📄 ${file.name} ${splitBadge}
                        </span>
                    </td>
                    <td>${whBadge}</td>
                    <td>${p2Display}</td>
                    <td style="color: var(--text-secondary); font-size: 0.72rem;">${file.rowCount ? file.rowCount + ' rows' : '—'}</td>
                    <td style="color: var(--text-secondary); font-size: 0.72rem;">${fileSizeFormatted}</td>
                    <td style="text-align: center;">
                        <div style="display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
                            <button class="btn-sub-icon btn-inspect-staged-file" data-file-id="${file.id}" title="Inspect first 50 rows" style="width: 24px; height: 24px; border-radius: 5px; border: 1px solid rgba(16, 185, 129, 0.25); background: rgba(16, 185, 129, 0.08); color: #059669; display: inline-flex; align-items: center; justify-content: center; cursor: pointer;">
                                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            </button>
                            <button class="btn-sub-icon btn-del-staged-file" data-file-id="${file.id}" data-filename="${file.name}" title="Delete file" style="width: 24px; height: 24px; border-radius: 5px; border: 1px solid rgba(220, 38, 38, 0.25); background: rgba(220, 38, 38, 0.08); color: #dc2626; display: inline-flex; align-items: center; justify-content: center; cursor: pointer;">
                                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </td>
                `;
                tbodyP2.appendChild(tr);
            });
        }
    }

    // 2. Render Column G Tax Files Table
    if (tbodyTax) {
        tbodyTax.innerHTML = '';
        if (gFiles.length === 0) {
            tbodyTax.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.2rem; font-size: 0.74rem;">No Tax (Column G) files loaded yet. Drop Column G files on the left.</td></tr>`;
        } else {
            gFiles.forEach((file, idx) => {
                const tr = document.createElement('tr');
                tr.className = `row-color-${idx % 7}`;
                const fileSizeFormatted = file.fileObj ? formatBytes(file.fileObj.size) : '—';
                const colGDisplay = file.colGValue 
                    ? `<span style="font-family: monospace; font-weight: 700; color: #059669; font-size: 0.72rem;">${file.colGValue}</span>`
                    : `<span style="color: var(--text-muted); font-style: italic; font-size: 0.7rem;">Not detected</span>`;

                tr.innerHTML = `
                    <td style="text-align: center; font-weight: 600;">${idx + 1}</td>
                    <td>
                        <span style="font-family: monospace; font-weight: 600; color: var(--text-primary); display: inline-flex; align-items: center; gap: 4px;">
                            📄 ${file.name}
                        </span>
                    </td>
                    <td>${colGDisplay}</td>
                    <td style="color: var(--text-secondary); font-size: 0.72rem;">${file.rowCount ? file.rowCount + ' rows' : '—'}</td>
                    <td style="color: var(--text-secondary); font-size: 0.72rem;">${fileSizeFormatted}</td>
                    <td style="text-align: center;">
                        <div style="display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
                            <button class="btn-sub-icon btn-inspect-staged-file" data-file-id="${file.id}" title="Inspect first 50 rows" style="width: 24px; height: 24px; border-radius: 5px; border: 1px solid rgba(16, 185, 129, 0.25); background: rgba(16, 185, 129, 0.08); color: #059669; display: inline-flex; align-items: center; justify-content: center; cursor: pointer;">
                                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            </button>
                            <button class="btn-sub-icon btn-del-staged-file" data-file-id="${file.id}" data-filename="${file.name}" title="Delete file" style="width: 24px; height: 24px; border-radius: 5px; border: 1px solid rgba(220, 38, 38, 0.25); background: rgba(220, 38, 38, 0.08); color: #dc2626; display: inline-flex; align-items: center; justify-content: center; cursor: pointer;">
                                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </td>
                `;
                tbodyTax.appendChild(tr);
            });
        }
    }

    // Attach click listeners for Inspect and Delete on staged files
    document.querySelectorAll('.btn-inspect-staged-file').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const fileId = parseInt(btn.getAttribute('data-file-id'), 10);
            const fileObj = renUploadedFiles.find(f => f.id === fileId);
            if (fileObj) {
                openRenFileInspector(fileObj);
            }
        });
    });

    document.querySelectorAll('.btn-del-staged-file').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const fileId = parseInt(btn.getAttribute('data-file-id'), 10);
            const fileName = btn.getAttribute('data-filename') || "File";
            showDeleteConfirmation({
                title: "Delete Staged File?",
                message: `Are you sure you want to remove "${fileName}" from the loaded queue?`,
                onConfirm: () => {
                    renUploadedFiles = renUploadedFiles.filter(f => f.id !== fileId);
                    resetRenameButtonState();
                    updateRenUploadBadges();
                    renderRenameState();
                    saveRenameSessionToStorage();
                    showToast(`File "${fileName}" removed.`, "info");
                }
            });
        });
    });
}

// Helper: Extract party code for Option B (Column G / TaxReportData / EE Invoice No files)
function extractCodeFromColG(colGVal, fileName) {
    const cleanVal = String(colGVal || "").trim();

    // 1. Check if cleanVal contains a direct match with partyData database codes (e.g. 225, 178, 139, 157, 221, etc.)
    if (cleanVal !== "" && typeof partyData !== "undefined" && partyData.length > 0) {
        for (let i = 0; i < partyData.length; i++) {
            const item = partyData[i];
            if (!item || !item.code) continue;
            const codeStr = String(item.code).trim();
            if (!codeStr) continue;

            const codeRegex = new RegExp(`(?:S|\\b|-|_)${codeStr}(?:-|\\b|_|\\d)`, 'i');
            if (codeRegex.test(cleanVal) || cleanVal.includes(codeStr)) {
                return codeStr;
            }
        }
    }

    // 2. Pattern extractions from cleanVal
    if (cleanVal !== "") {
        const uppercaseVal = cleanVal.toUpperCase();

        // Pattern A: MY27S225-183 -> extract "225" (S followed by 2-4 digits before hyphen)
        const myntraInvoiceMatch = cleanVal.match(/S(\d{2,4})[-_]/i);
        if (myntraInvoiceMatch) {
            return myntraInvoiceMatch[1];
        }

        // Pattern B: Digits immediately preceding hyphen e.g. MY27S225-183 -> "225" or 178-INV -> "178"
        const preHyphenMatch = cleanVal.match(/(\d{2,4})-(?=\d+)/);
        if (preHyphenMatch) {
            return preHyphenMatch[1];
        }

        // Pattern C: Starts with CGJ1- (e.g. CGJ1-178-INV001 -> extract "178")
        if (uppercaseVal.startsWith("CGJ1-")) {
            const parts = cleanVal.split('-');
            if (parts.length > 1 && parts[1].trim() !== "") {
                const secondPart = parts[1].trim();
                return secondPart.length > 3 ? secondPart.slice(-3) : secondPart;
            }
        }

        // Pattern D: Hyphenated value (e.g. 178-INV001 -> extract "178")
        if (cleanVal.includes('-')) {
            const parts = cleanVal.split('-');
            const firstPart = parts[0].trim();
            if (firstPart !== "" && firstPart.toUpperCase() !== "CGJ1") {
                const numPart = firstPart.match(/\d+/);
                if (numPart) {
                    return numPart[0].length > 3 ? numPart[0].slice(-3) : numPart[0];
                }
                return firstPart.length > 3 ? firstPart.slice(-3) : firstPart;
            } else if (parts.length > 1 && parts[1].trim() !== "") {
                const secondPart = parts[1].trim();
                const numPart = secondPart.match(/\d+/);
                if (numPart) {
                    return numPart[0].length > 3 ? numPart[0].slice(-3) : numPart[0];
                }
                return secondPart.length > 3 ? secondPart.slice(-3) : secondPart;
            }
        }

        // Pattern E: Match numeric sequence of 2-4 digits
        const numMatch = cleanVal.match(/\b\d{2,4}\b/);
        if (numMatch) {
            return numMatch[0];
        }

        // Fallback: Right 3 characters
        return cleanVal.length >= 3 ? cleanVal.slice(-3) : cleanVal;
    }

    // 3. Fallback: Search filename for partyData database code
    if (fileName && typeof partyData !== "undefined" && partyData.length > 0) {
        for (let i = 0; i < partyData.length; i++) {
            const item = partyData[i];
            if (!item || !item.code) continue;
            const codeStr = String(item.code).trim();
            if (codeStr && fileName.includes(codeStr)) {
                return codeStr;
            }
        }
    }

    return "";
}

// Calculate Rename codes & names based on each file's Method
function calculateRenameResults() {
    if (renUploadedFiles.length === 0) {
        renderCategorizedRenamePreview();
        return;
    }

    const usedNames = new Set();

    renUploadedFiles.forEach(fileObj => {
        let renameCode = fileObj.renameCode; // Preserve manually edited code if already set

        if (!renameCode || renameCode === "Not Found") {
            if (fileObj.methodType === 'p2') {
                // OPTION A: P2 Value direct database match (supports main name & bracket alias names) or fallback
                if (fileObj.p2Value !== "") {
                    const rawP2 = String(fileObj.p2Value).trim();
                    const normP2 = rawP2.toUpperCase().replace(/[^A-Z0-9]/g, "");
                    let partyCodeMatch = "";

                    if (normP2 !== "") {
                        // Loop through Google sheet synced party data
                        for (let i = 0; i < partyData.length; i++) {
                            const item = partyData[i];
                            if (!item) continue;

                            const itemCode = String(item.code || "").trim();
                            const normCode = itemCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
                            const fullPartyCode = String(item.partyCode || "").trim();

                            // 1. Direct match with numeric/code (e.g., P2 contains "178")
                            if (normCode !== "" && normP2 === normCode) {
                                partyCodeMatch = itemCode;
                                break;
                            }

                            // 2. Extract bracket alias names, e.g. "CB-COLEBROOK" from "178-COLEBROOK(CB-COLEBROOK)"
                            const bracketMatches = [];
                            const bracketRegex = /\(([^)]+)\)/g;
                            let match;
                            while ((match = bracketRegex.exec(fullPartyCode)) !== null) {
                                if (match[1]) {
                                    bracketMatches.push(match[1].trim());
                                }
                            }

                            // Check bracket alias names match
                            let matchedInBracket = false;
                            for (let b = 0; b < bracketMatches.length; b++) {
                                const normBracket = bracketMatches[b].toUpperCase().replace(/[^A-Z0-9]/g, "");
                                if (normBracket !== "" && (normBracket === normP2 || (normP2.length >= 3 && normBracket.indexOf(normP2) !== -1) || (normBracket.length >= 3 && normP2.indexOf(normBracket) !== -1))) {
                                    partyCodeMatch = itemCode;
                                    matchedInBracket = true;
                                    break;
                                }
                            }
                            if (matchedInBracket) break;

                            // 3. Check main name outside brackets (e.g. "COLEBROOK" from "178-COLEBROOK(CB-COLEBROOK)")
                            const outsideBracketStr = fullPartyCode.replace(/\([^)]*\)/g, "").trim();
                            const normOutside = outsideBracketStr.toUpperCase().replace(/[^A-Z0-9]/g, "");

                            if (normOutside !== "" && (normOutside === normP2 || (normP2.length >= 3 && normOutside.indexOf(normP2) !== -1) || (normOutside.length >= 3 && normP2.indexOf(normOutside) !== -1))) {
                                partyCodeMatch = itemCode;
                                break;
                            }

                            // 4. Fallback full string match (without brackets)
                            const normFull = fullPartyCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
                            if (normFull !== "" && (normFull.indexOf(normP2) !== -1 || normP2.indexOf(normFull) !== -1)) {
                                partyCodeMatch = itemCode;
                                break;
                            }
                        }
                    }

                    if (partyCodeMatch !== "") {
                        renameCode = partyCodeMatch;
                    } else {
                        renameCode = fileObj.p2Value || "Not Found";
                    }
                } else {
                    renameCode = "Not Found";
                }
            } else {
                // OPTION B: Column G cell extraction (with smart CGJ1- & Party Database matching)
                const extractedCode = extractCodeFromColG(fileObj.colGValue, fileObj.name);
                if (extractedCode !== "") {
                    renameCode = extractedCode;
                } else {
                    renameCode = "Not Found";
                }
            }
        }

        if (renameCode && renameCode !== "Not Found") {
            const ext = `.${fileObj.ext}`;
            const baseName = fileObj.name.substring(0, fileObj.name.lastIndexOf('.')) || fileObj.name;
            
            // Format: renameCode-oldName.ext
            let targetName = `${renameCode}-${baseName}${ext}`;

            // Duplicate collision handling
            let counter = 1;
            let checkName = targetName;
            while (usedNames.has(checkName.toLowerCase())) {
                checkName = `${renameCode}-${baseName} (${counter})${ext}`;
                counter++;
            }
            targetName = checkName;

            fileObj.renameCode = renameCode;
            fileObj.renamedName = targetName;
            usedNames.add(targetName.toLowerCase());
        } else {
            fileObj.renameCode = "Not Found";
            fileObj.renamedName = fileObj.name;
        }
    });

    renderCategorizedRenamePreview();
}

// Remove an individual file from rename queue
function removeRenFile(fileId) {
    const file = renUploadedFiles.find(f => f.id === fileId);
    const fileName = file ? file.name : "File";
    showDeleteConfirmation({
        title: "Delete File?",
        message: `Are you sure you want to delete "${fileName}"?`,
        onConfirm: () => {
            renUploadedFiles = renUploadedFiles.filter(f => f.id !== fileId);
            resetRenameButtonState();
            updateRenUploadBadges();
            calculateRenameResults();
            renderRenameState();
            if (document.getElementById('ren-fullview-modal') && document.getElementById('ren-fullview-modal').classList.contains('show')) {
                renderFullViewModalRows();
            }
            saveRenameSessionToStorage();
            showToast(`File "${fileName}" removed.`, "info");
        }
    });
}

// Open Sheet Data Inspector for first 50 rows
async function openRenFileInspector(file) {
    if (!file) return;

    const modal = document.getElementById('inspector-modal');
    const modalTitleElem = document.getElementById('modal-title');
    const inspectorTheadElem = document.getElementById('inspector-thead');
    const inspectorTbodyElem = document.getElementById('inspector-tbody');

    if (!modal) return;

    if (modalTitleElem) modalTitleElem.textContent = `Inspect File: ${file.name}`;
    if (inspectorTheadElem) inspectorTheadElem.innerHTML = '';
    if (inspectorTbodyElem) {
        inspectorTbodyElem.innerHTML = '<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading spreadsheet data...</td></tr>';
    }

    modal.classList.add('show');
    modal.classList.remove('hidden');

    let rows = file.parsedAOA;
    if (!rows || rows.length === 0) {
        try {
            rows = await readExcelAsAOA(file.fileObj);
            file.parsedAOA = rows ? rows.slice(0, 50) : null;
        } catch (e) {
            if (inspectorTbodyElem) {
                inspectorTbodyElem.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--color-danger); padding: 2rem;">Error reading file: ${e.message}</td></tr>`;
            }
            return;
        }
    }

    if (!rows || rows.length === 0) {
        if (inspectorTbodyElem) {
            inspectorTbodyElem.innerHTML = '<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 2rem;">No preview rows available.</td></tr>';
        }
        return;
    }

    if (inspectorTheadElem) inspectorTheadElem.innerHTML = '';
    if (inspectorTbodyElem) inspectorTbodyElem.innerHTML = '';

    const maxRows = Math.min(rows.length, 50);
    const headers = rows[0] || [];

    // Header row
    const trHead = document.createElement('tr');
    headers.forEach((h, colIndex) => {
        const th = document.createElement('th');
        th.style.padding = '0.6rem 0.85rem';
        th.style.color = 'var(--text-secondary)';
        th.style.fontSize = '0.75rem';
        th.style.borderBottom = '1px solid rgba(0, 0, 0, 0.08)';
        
        const excelLetter = typeof getExcelColumnLetter === 'function' ? getExcelColumnLetter(colIndex) : String.fromCharCode(65 + colIndex);
        th.innerHTML = `<span style="display:block; font-size: 0.65rem; color: var(--text-muted); font-weight: 700;">${excelLetter}</span>${h !== undefined && h !== null ? h : ''}`;
        trHead.appendChild(th);
    });
    if (inspectorTheadElem) inspectorTheadElem.appendChild(trHead);

    // Body rows
    for (let r = 1; r < maxRows; r++) {
        const row = rows[r] || [];
        const tr = document.createElement('tr');
        tr.className = `row-color-${(r - 1) % 7}`;
        
        headers.forEach((_, colIndex) => {
            const td = document.createElement('td');
            td.style.padding = '0.45rem 0.85rem';
            td.style.fontSize = '0.75rem';
            const cellVal = row[colIndex];
            td.textContent = (cellVal !== undefined && cellVal !== null) ? cellVal : '';
            tr.appendChild(td);
        });
        if (inspectorTbodyElem) inspectorTbodyElem.appendChild(tr);
    }
}

// Open Edit Prefix Modal for a file
function openEditPrefixModal(file) {
    renActiveEditFile = file;
    const editPrefixModal = document.getElementById('edit-prefix-modal');
    const editPrefixFilename = document.getElementById('edit-prefix-filename');
    const editPrefixInput = document.getElementById('edit-prefix-input');

    if (!editPrefixModal || !file) return;

    if (editPrefixFilename) editPrefixFilename.textContent = file.name;
    if (editPrefixInput) {
        editPrefixInput.value = (file.renameCode && file.renameCode !== "Not Found") ? file.renameCode : "";
        setTimeout(() => editPrefixInput.focus(), 100);
    }

    editPrefixModal.classList.add('show');
    editPrefixModal.classList.remove('hidden');
}

function closeEditPrefixModal() {
    const editPrefixModal = document.getElementById('edit-prefix-modal');
    if (editPrefixModal) {
        editPrefixModal.classList.remove('show');
        editPrefixModal.classList.add('hidden');
    }
    renActiveEditFile = null;
}

function saveEditPrefix() {
    if (!renActiveEditFile) return;

    const editPrefixInput = document.getElementById('edit-prefix-input');
    const newPrefix = editPrefixInput ? editPrefixInput.value.trim() : "";

    if (newPrefix) {
        renActiveEditFile.renameCode = newPrefix;
        const ext = `.${renActiveEditFile.ext}`;
        const baseName = renActiveEditFile.name.substring(0, renActiveEditFile.name.lastIndexOf('.')) || renActiveEditFile.name;
        renActiveEditFile.renamedName = `${newPrefix}-${baseName}${ext}`;
        showToast(`Prefix "${newPrefix}" applied! Status changed to Matched.`, "success");
    } else {
        renActiveEditFile.renameCode = "Not Found";
        renActiveEditFile.renamedName = renActiveEditFile.name;
        showToast("Prefix cleared.", "info");
    }

    closeEditPrefixModal();
    calculateRenameResults();
    renderRenameState();
    renderFullViewModalRows();
    saveRenameSessionToStorage();
}

// Open Full View Modal for a category
function openRenFullViewModal(category = 'all') {
    renFullviewCategory = category;
    const renFullviewModal = document.getElementById('ren-fullview-modal');
    const renFullviewTitle = document.getElementById('ren-fullview-title');
    const renFullviewSearch = document.getElementById('ren-fullview-search');

    if (!renFullviewModal) return;

    if (renFullviewTitle) {
        if (category === 'p2') renFullviewTitle.textContent = "📦 Order Files (P2) — Full View";
        else if (category === 'g') renFullviewTitle.textContent = "📊 Tax Files (Column G) — Full View";
        else renFullviewTitle.textContent = "Full View — All Renamed Files";
    }

    if (renFullviewSearch) renFullviewSearch.value = "";

    renderFullViewModalRows();
    renFullviewModal.classList.add('show');
    renFullviewModal.classList.remove('hidden');
}

function renderFullViewModalRows() {
    const tbody = document.getElementById('tbody-fullview-files');
    const countTag = document.getElementById('ren-fullview-count');
    const searchInput = document.getElementById('ren-fullview-search');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

    if (!tbody) return;
    tbody.innerHTML = '';

    let list = renUploadedFiles;
    if (renFullviewCategory === 'p2') list = list.filter(f => f.methodType === 'p2');
    else if (renFullviewCategory === 'g') list = list.filter(f => f.methodType === 'g');

    if (query) {
        list = list.filter(f => f.name.toLowerCase().includes(query) || (f.renameCode && f.renameCode.toLowerCase().includes(query)) || f.renamedName.toLowerCase().includes(query));
    }

    // Sort: Unmatched ("Not Found") files at the TOP!
    const sorted = [...list].sort((a, b) => {
        const aUnmatched = (!a.renameCode || a.renameCode === "Not Found");
        const bUnmatched = (!b.renameCode || b.renameCode === "Not Found");
        if (aUnmatched && !bUnmatched) return -1;
        if (!aUnmatched && bUnmatched) return 1;
        return a.id - b.id;
    });

    if (countTag) countTag.textContent = `${sorted.length} files`;

    if (sorted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No matching files found.</td></tr>`;
        return;
    }

    sorted.forEach((file, idx) => {
        const isUnmatched = (!file.renameCode || file.renameCode === "Not Found");
        const tr = document.createElement('tr');
        tr.className = isUnmatched ? 'row-unmatched-warning' : `row-color-${idx % 7}`;
        if (isUnmatched) {
            tr.style.background = "rgba(220, 38, 38, 0.08)";
            tr.style.borderLeft = "3.5px solid #dc2626";
        }

        const codeBadge = isUnmatched
            ? `<span class="badge" style="background: rgba(220, 38, 38, 0.15); color: #dc2626; border: 1px solid rgba(220, 38, 38, 0.3); font-weight: 700;">⚠️ Not Found</span>`
            : `<span class="badge" style="background: rgba(5, 150, 105, 0.15); color: #059669; border: 1px solid rgba(5, 150, 105, 0.3); font-weight: 700;">${file.renameCode}</span>`;

        tr.innerHTML = `
            <td><strong>${idx + 1}</strong></td>
            <td>
                <span class="file-name btn-inspect-file" style="cursor: pointer; font-weight: 600; color: var(--text-primary);" title="Click to view Excel rows">${file.name}</span>
            </td>
            <td>${codeBadge}</td>
            <td><span style="color: var(--primary); font-weight: 600; font-size: 0.8rem;">${file.renamedName}</span></td>
            <td style="text-align: center;">
                <div style="display: inline-flex; gap: 4px;">
                    <button class="btn-action btn-inspect-file" title="Inspect first 50 rows" style="width: 26px; height: 26px; border-radius: 6px; border: none; background: rgba(124, 58, 237, 0.08); color: var(--primary); cursor: pointer;">
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    </button>
                    <button class="btn-action btn-edit-prefix" title="Manually edit prefix code" style="width: 26px; height: 26px; border-radius: 6px; border: none; background: rgba(5, 150, 105, 0.08); color: #059669; cursor: pointer;">
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="btn-action btn-del-file" title="Delete file" style="width: 26px; height: 26px; border-radius: 6px; border: none; background: rgba(220, 38, 38, 0.08); color: var(--color-danger); cursor: pointer;">
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </td>
        `;

        tr.querySelectorAll('.btn-inspect-file').forEach(el => el.addEventListener('click', () => openRenFileInspector(file)));
        const btnEdit = tr.querySelector('.btn-edit-prefix');
        if (btnEdit) btnEdit.addEventListener('click', () => openEditPrefixModal(file));
        const btnDel = tr.querySelector('.btn-del-file');
        if (btnDel) btnDel.addEventListener('click', () => {
            removeRenFile(file.id);
            renderFullViewModalRows();
        });

        tbody.appendChild(tr);
    });
}

// Render Categorized Preview Cards (Order Files & Tax Files)
function renderCategorizedRenamePreview() {
    const emptyState = document.getElementById('ren-empty-state');
    const resultsContainer = document.getElementById('ren-results-container');
    const btnRenameRun = document.getElementById('btn-rename-run');
    const totalSummaryTag = document.getElementById('ren-total-summary-tag');
    const unmatchedSummaryTag = document.getElementById('ren-unmatched-summary-tag');

    const p2Files = renUploadedFiles.filter(f => f.methodType === 'p2');
    const gFiles = renUploadedFiles.filter(f => f.methodType === 'g');
    const totalFiles = renUploadedFiles.length;

    const unmatchedTotal = renUploadedFiles.filter(f => !f.renameCode || f.renameCode === "Not Found").length;
    const unmatchedP2 = p2Files.filter(f => !f.renameCode || f.renameCode === "Not Found").length;
    const unmatchedG = gFiles.filter(f => !f.renameCode || f.renameCode === "Not Found").length;

    if (totalFiles === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (resultsContainer) resultsContainer.classList.add('hidden');
        if (btnRenameRun) btnRenameRun.classList.add('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (resultsContainer) resultsContainer.classList.remove('hidden');
    if (btnRenameRun) btnRenameRun.classList.remove('hidden');

    // Summary bar tags
    if (totalSummaryTag) totalSummaryTag.textContent = `${totalFiles} total files (📦 Order: ${p2Files.length}, 📊 Tax: ${gFiles.length})`;
    if (unmatchedSummaryTag) {
        if (unmatchedTotal > 0) {
            unmatchedSummaryTag.textContent = `⚠️ ${unmatchedTotal} Need Prefix`;
            unmatchedSummaryTag.classList.remove('hidden');
        } else {
            unmatchedSummaryTag.classList.add('hidden');
        }
    }

    // Render Order Files Table
    renderFileTableSection('tbody-order-files', 'order-files-count-badge', 'order-unmatched-badge', p2Files, unmatchedP2, 'p2');

    // Render Tax Files Table
    renderFileTableSection('tbody-tax-files', 'tax-files-count-badge', 'tax-unmatched-badge', gFiles, unmatchedG, 'g');

    // If full view modal is open, refresh it as well
    const fullviewModal = document.getElementById('ren-fullview-modal');
    if (fullviewModal && fullviewModal.classList.contains('show')) {
        renderFullViewModalRows();
    }
}

// Helper to render one table section (Order or Tax)
function renderFileTableSection(tbodyId, countBadgeId, unmatchedBadgeId, fileList, unmatchedCount, category) {
    const tbody = document.getElementById(tbodyId);
    const countBadge = document.getElementById(countBadgeId);
    const unmatchedBadge = document.getElementById(unmatchedBadgeId);

    if (countBadge) countBadge.textContent = `${fileList.length} file${fileList.length === 1 ? '' : 's'}`;
    if (unmatchedBadge) {
        if (unmatchedCount > 0) {
            unmatchedBadge.textContent = `⚠️ ${unmatchedCount} Need Prefix`;
            unmatchedBadge.classList.remove('hidden');
        } else {
            unmatchedBadge.classList.add('hidden');
        }
    }

    if (!tbody) return;
    tbody.innerHTML = '';

    if (fileList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem; font-size: 0.74rem;">No ${category === 'p2' ? 'Order' : 'Tax'} files uploaded yet.</td></tr>`;
        return;
    }

    // Sort: Unmatched files ("Not Found") come FIRST (at the top)!
    const sorted = [...fileList].sort((a, b) => {
        const aUnmatched = (!a.renameCode || a.renameCode === "Not Found");
        const bUnmatched = (!b.renameCode || b.renameCode === "Not Found");
        if (aUnmatched && !bUnmatched) return -1;
        if (!aUnmatched && bUnmatched) return 1;
        return a.id - b.id;
    });

    sorted.forEach((file, idx) => {
        const isUnmatched = (!file.renameCode || file.renameCode === "Not Found");
        const tr = document.createElement('tr');
        tr.className = isUnmatched ? 'row-unmatched-warning' : `row-color-${idx % 7}`;
        if (isUnmatched) {
            tr.style.background = "rgba(220, 38, 38, 0.08)";
            tr.style.borderLeft = "3.5px solid #dc2626";
        }

        const codeBadge = isUnmatched
            ? `<span class="badge" style="background: rgba(220, 38, 38, 0.15); color: #dc2626; border: 1px solid rgba(220, 38, 38, 0.3); font-weight: 700;">⚠️ Not Found</span>`
            : `<span class="badge ${category === 'p2' ? 'badge-od' : 'badge-dt'}" style="font-weight: 700;">${file.renameCode}</span>`;

        tr.innerHTML = `
            <td><strong>${idx + 1}</strong></td>
            <td>
                <span class="file-name btn-inspect-file" style="cursor: pointer; font-weight: 600; color: var(--text-primary); text-decoration: underline dotted;" title="Click to view Excel rows">${file.name}</span>
            </td>
            <td>${codeBadge}</td>
            <td><span style="color: var(--primary); font-weight: 600; font-size: 0.78rem;">${file.renamedName}</span></td>
            <td style="text-align: center;">
                <div style="display: inline-flex; gap: 4px;">
                    <button class="btn-action btn-inspect-file" title="Inspect first 50 rows" style="width: 24px; height: 24px; border-radius: 6px; border: none; background: rgba(124, 58, 237, 0.08); color: var(--primary); cursor: pointer;">
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    </button>
                    <button class="btn-action btn-edit-prefix" title="Manually edit prefix code" style="width: 24px; height: 24px; border-radius: 6px; border: none; background: rgba(5, 150, 105, 0.08); color: #059669; cursor: pointer;">
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="btn-action btn-del-file" title="Delete file" style="width: 24px; height: 24px; border-radius: 6px; border: none; background: rgba(220, 38, 38, 0.08); color: var(--color-danger); cursor: pointer;">
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </td>
        `;

        tr.querySelectorAll('.btn-inspect-file').forEach(el => el.addEventListener('click', () => openRenFileInspector(file)));
        const btnEdit = tr.querySelector('.btn-edit-prefix');
        if (btnEdit) btnEdit.addEventListener('click', () => openEditPrefixModal(file));
        const btnDel = tr.querySelector('.btn-del-file');
        if (btnDel) btnDel.addEventListener('click', () => removeRenFile(file.id));

        tbody.appendChild(tr);
    });
}

// Move Order Files to Merge File Tab
function moveToMergeTab() {
    const orderFiles = renUploadedFiles.filter(f => f.methodType === 'p2');
    if (orderFiles.length === 0) {
        showToast("No Order files available to move.", "error");
        return;
    }

    const filesToMerge = orderFiles.map(f => new File([f.fileObj], f.renamedName, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    
    // Pass directly to merge tab handler
    handleMrgFileSelection(filesToMerge);

    // Switch active tab to tab-merge
    const mergeTabBtn = document.getElementById('btn-merge-file') || document.querySelector('.tab-btn[data-tab="tab-merge"]');
    if (mergeTabBtn) mergeTabBtn.click();

    showToast(`${orderFiles.length} Order files transferred to Merge File tab!`, "success");
}

// Move Tax Files to Folder Create Tab
function moveToFolderCreateTab() {
    const taxFiles = renUploadedFiles.filter(f => f.methodType === 'g');
    if (taxFiles.length === 0) {
        showToast("No Tax files available to move.", "error");
        return;
    }

    const filesToFolder = taxFiles.map(f => new File([f.fileObj], f.renamedName, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));

    // Pass directly to folder create handler
    handleFldFileSelection(filesToFolder);

    // Switch active tab to tab-folder-create
    const folderTabBtn = document.getElementById('btn-folder-create-tab') || document.querySelector('.tab-btn[data-tab="tab-folder-create"]');
    if (folderTabBtn) folderTabBtn.click();

    showToast(`${taxFiles.length} Tax files transferred to Folder Create tab!`, "success");
}

// Download Zip function (Order only, Tax only, or All)
async function downloadRenZip(category = 'all') {
    let filesToZip = renUploadedFiles;
    let zipName = "myntra_all_files_renamed.zip";

    if (category === 'p2') {
        filesToZip = renUploadedFiles.filter(f => f.methodType === 'p2');
        zipName = "myntra_order_files_renamed.zip";
    } else if (category === 'g') {
        filesToZip = renUploadedFiles.filter(f => f.methodType === 'g');
        zipName = "myntra_tax_files_renamed.zip";
    }

    if (filesToZip.length === 0) {
        showToast("No files available to download for this category.", "error");
        return;
    }

    const renProgress = document.getElementById('ren-progress');
    const renProgressPercent = document.getElementById('ren-progress-percent');
    const renProgressText = document.getElementById('ren-progress-text');
    const renProgressFill = document.getElementById('ren-progress-fill');

    if (renProgress) renProgress.classList.remove('hidden');

    const updateRenProgress = (percent, text) => {
        if (renProgressPercent) renProgressPercent.textContent = `${Math.round(percent)}%`;
        if (renProgressFill) renProgressFill.style.width = `${percent}%`;
        if (renProgressText && text) renProgressText.textContent = text;
    };

    updateRenProgress(10, `Packaging ${filesToZip.length} files...`);
    await new Promise(r => setTimeout(r, 40));

    try {
        const zip = new JSZip();

        for (let i = 0; i < filesToZip.length; i++) {
            const file = filesToZip[i];
            const fileProgress = 10 + Math.round((i / filesToZip.length) * 80);
            updateRenProgress(fileProgress, `Adding: ${file.renamedName}...`);
            await new Promise(r => setTimeout(r, 10));

            zip.file(file.renamedName, file.fileObj);
        }

        updateRenProgress(95, "Generating ZIP package...");
        await new Promise(r => setTimeout(r, 40));

        const blob = await zip.generateAsync({ type: "blob" });

        updateRenProgress(100, "Downloading!");

        // Trigger browser download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = zipName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => {
            URL.revokeObjectURL(url);
            if (renProgress) {
                renProgress.classList.add('hidden');
                if (renProgressPercent) renProgressPercent.textContent = "0%";
                if (renProgressFill) renProgressFill.style.width = "0%";
            }
        }, 1200);

        showToast(`${zipName} downloaded successfully!`, "success");

    } catch (err) {
        console.error(err);
        showToast("Error generating zip: " + err.message, "error");
        if (renProgress) renProgress.classList.add('hidden');
    }
}

// ==========================================
// GLOBAL DELETE CONFIRMATION MODAL
// ==========================================

let pendingDeleteCallback = null;

function showDeleteConfirmation({ title = "Confirm Delete", message = "Are you sure you want to delete this item?", onConfirm }) {
    const modal = document.getElementById('confirm-delete-modal');
    const titleElem = document.getElementById('confirm-delete-title');
    const descElem = document.getElementById('confirm-delete-desc');

    if (!modal) {
        if (confirm(message)) {
            if (typeof onConfirm === 'function') onConfirm();
        }
        return;
    }

    if (titleElem) titleElem.textContent = title;
    if (descElem) descElem.textContent = message;

    pendingDeleteCallback = onConfirm;

    modal.classList.add('show');
    modal.classList.remove('hidden');
}

function closeDeleteConfirmation() {
    const modal = document.getElementById('confirm-delete-modal');
    if (modal) {
        modal.classList.remove('show');
        modal.classList.add('hidden');
    }
    pendingDeleteCallback = null;
}

function setupDeleteConfirmationModal() {
    const modal = document.getElementById('confirm-delete-modal');
    const btnClose = document.getElementById('btn-close-confirm-delete');
    const btnCancel = document.getElementById('btn-cancel-confirm-delete');
    const btnAction = document.getElementById('btn-action-confirm-delete');

    if (btnClose) btnClose.addEventListener('click', closeDeleteConfirmation);
    if (btnCancel) btnCancel.addEventListener('click', closeDeleteConfirmation);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeDeleteConfirmation();
        });
    }
    if (btnAction) {
        btnAction.addEventListener('click', () => {
            const cb = pendingDeleteCallback;
            closeDeleteConfirmation();
            if (typeof cb === 'function') {
                cb();
            }
        });
    }
}

// ==========================================
// MERGE FILE TAB OPERATIONS (1-Hour Session, Full View, Edit Key, Move to Folder)
// ==========================================

// State Variables for Merge File tab
let mrgUploadedFiles = []; // Array of { id, name, fileObj, ext, groupKey, aoa }
let mrgUniqueGroups = [];  // Array of Group Keys
let mrgGroupsMap = new Map(); // Map from Group Key -> Array of file objects
let mrgGeneratedZipBlob = null;
let mrgGeneratedZipName = "";
let mrgSingleFileBlob = null; // If only 1 merged output, store as Excel blob directly
let mrgSingleFileName = "";
let mrgNextId = 1;
let mrgSessionTimerInterval = null;
let mrgActiveEditGroupKey = null;

// IndexedDB Session Storage Config (1 Hour Expiry) for Merge Tab
const MRG_DB_NAME = 'MyntraMergeCacheDB';
const MRG_DB_STORE = 'mergeSession';
const MRG_DB_VERSION = 1;
const MRG_SESSION_EXPIRY_MS = 60 * 60 * 1000; // 1 Hour in ms

function openMergeDB() {
    return new Promise((resolve) => {
        if (!window.indexedDB) {
            resolve(null);
            return;
        }
        try {
            const req = indexedDB.open(MRG_DB_NAME, MRG_DB_VERSION);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(MRG_DB_STORE)) {
                    db.createObjectStore(MRG_DB_STORE, { keyPath: 'id' });
                }
            };
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = () => resolve(null);
        } catch (e) {
            resolve(null);
        }
    });
}

async function saveMergeSessionToStorage() {
    try {
        const db = await openMergeDB();
        if (!db) return;

        if (mrgUploadedFiles.length === 0) {
            const tx = db.transaction([MRG_DB_STORE], 'readwrite');
            tx.objectStore(MRG_DB_STORE).delete('currentSession');
            hideMrgSessionBanner();
            return;
        }

        const serializedFiles = mrgUploadedFiles.map(f => ({
            id: f.id,
            name: f.name,
            ext: f.ext,
            groupKey: f.groupKey,
            aoa: f.aoa ? f.aoa.slice(0, 50) : null,
            blob: f.fileObj
        }));

        const expiresAt = Date.now() + MRG_SESSION_EXPIRY_MS;
        const sessionData = {
            id: 'currentSession',
            timestamp: Date.now(),
            expiresAt: expiresAt,
            files: serializedFiles
        };

        const tx = db.transaction([MRG_DB_STORE], 'readwrite');
        tx.objectStore(MRG_DB_STORE).put(sessionData);
        startMrgSessionTimer(expiresAt);
    } catch (err) {
        console.warn("Merge IndexedDB save error:", err);
    }
}

async function loadMergeSessionFromStorage() {
    try {
        const db = await openMergeDB();
        if (!db) return;

        const tx = db.transaction([MRG_DB_STORE], 'readonly');
        const store = tx.objectStore(MRG_DB_STORE);
        const req = store.get('currentSession');

        req.onsuccess = async () => {
            const data = req.result;
            if (!data) return;

            const now = Date.now();
            if (now > data.expiresAt) {
                clearMergeSessionStorage();
                return;
            }

            if (data.files && data.files.length > 0) {
                mrgUploadedFiles = data.files.map(f => {
                    let fileObj = f.blob;
                    if (f.blob && !(f.blob instanceof Blob)) {
                        fileObj = new Blob([f.blob]);
                    }
                    return {
                        id: f.id,
                        name: f.name,
                        fileObj: fileObj,
                        ext: f.ext,
                        groupKey: f.groupKey || '',
                        aoa: f.aoa || []
                    };
                });

                mrgNextId = Math.max(...mrgUploadedFiles.map(f => f.id), 0) + 1;
                recalculateMergeGroups();
                renderMergePreview();
                startMrgSessionTimer(data.expiresAt);
                showToast(`Restored ${mrgUploadedFiles.length} files in Merge tab from 1-hour session!`, "info");
            }
        };
    } catch (err) {
        console.warn("Merge IndexedDB load error:", err);
    }
}

async function clearMergeSessionStorage() {
    try {
        const db = await openMergeDB();
        if (!db) return;
        const tx = db.transaction([MRG_DB_STORE], 'readwrite');
        tx.objectStore(MRG_DB_STORE).delete('currentSession');
        hideMrgSessionBanner();
    } catch (err) {
        console.warn("Merge IndexedDB clear error:", err);
    }
}

function startMrgSessionTimer(expiresAt) {
    const banner = document.getElementById('mrg-session-banner');
    const timerElem = document.getElementById('mrg-session-timer');
    if (!banner || !timerElem) return;

    banner.classList.remove('hidden');

    if (mrgSessionTimerInterval) clearInterval(mrgSessionTimerInterval);

    const updateTimer = () => {
        const remainingMs = expiresAt - Date.now();
        if (remainingMs <= 0) {
            timerElem.textContent = "Session expired";
            clearInterval(mrgSessionTimerInterval);
            clearMergeSessionStorage();
            return;
        }
        const mins = Math.floor(remainingMs / (60 * 1000));
        const secs = Math.floor((remainingMs % (60 * 1000)) / 1000);
        timerElem.textContent = `Auto-clears in ${mins}m ${secs}s`;
    };

    updateTimer();
    mrgSessionTimerInterval = setInterval(updateTimer, 1000);
}

function hideMrgSessionBanner() {
    const banner = document.getElementById('mrg-session-banner');
    if (banner) banner.classList.add('hidden');
    if (mrgSessionTimerInterval) {
        clearInterval(mrgSessionTimerInterval);
        mrgSessionTimerInterval = null;
    }
}

function setupMergeFile() {
    const mrgDropzone = document.getElementById('mrg-dropzone');
    const mrgFileInput = document.getElementById('mrg-file-input');
    const btnMergeRun = document.getElementById('btn-merge-run');
    const btnMrgFullview = document.getElementById('btn-mrg-fullview');
    const btnCloseMrgFullview = document.getElementById('btn-close-mrg-fullview');
    const mrgFullviewSearch = document.getElementById('mrg-fullview-search');
    const btnMrgMoveToFolder = document.getElementById('btn-mrg-move-to-folder');
    const btnMrgDownloadZip = document.getElementById('btn-mrg-download-zip');

    // Edit Group Key modal elements
    const btnCloseEditGroupKey = document.getElementById('btn-close-edit-group-key');
    const btnCancelEditGroupKey = document.getElementById('btn-cancel-edit-group-key');
    const btnSaveEditGroupKey = document.getElementById('btn-save-edit-group-key');
    const editGroupKeyInput = document.getElementById('edit-group-key-input');
    
    if (mrgDropzone && mrgFileInput) {
        mrgDropzone.addEventListener('click', () => mrgFileInput.click());
        mrgFileInput.addEventListener('change', (e) => handleMrgFileSelection(e.target.files));

        mrgDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            mrgDropzone.classList.add('dragover');
        });

        mrgDropzone.addEventListener('dragleave', () => {
            mrgDropzone.classList.remove('dragover');
        });

        mrgDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            mrgDropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                handleMrgFileSelection(e.dataTransfer.files);
            }
        });
    }

    if (btnMergeRun) btnMergeRun.addEventListener('click', runMergeProcess);
    if (btnMrgFullview) btnMrgFullview.addEventListener('click', openMrgFullViewModal);
    if (btnCloseMrgFullview) btnCloseMrgFullview.addEventListener('click', closeMrgFullViewModal);
    if (mrgFullviewSearch) mrgFullviewSearch.addEventListener('input', renderMrgFullViewModalRows);

    if (btnMrgMoveToFolder) btnMrgMoveToFolder.addEventListener('click', moveToFolderCreateFromMerge);
    if (btnMrgDownloadZip) btnMrgDownloadZip.addEventListener('click', runMergeProcess);

    if (btnCloseEditGroupKey) btnCloseEditGroupKey.addEventListener('click', closeEditGroupKeyModal);
    if (btnCancelEditGroupKey) btnCancelEditGroupKey.addEventListener('click', closeEditGroupKeyModal);
    if (btnSaveEditGroupKey) btnSaveEditGroupKey.addEventListener('click', saveEditGroupKey);
    if (editGroupKeyInput) {
        editGroupKeyInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') saveEditGroupKey();
        });
    }

    // Restore 1-hour session from IndexedDB if available
    loadMergeSessionFromStorage();
}

function resetMergeButtonState() {
    mrgGeneratedZipBlob = null;
    mrgGeneratedZipName = "";
    mrgSingleFileBlob = null;
    mrgSingleFileName = "";
    const btnMergeRun = document.getElementById('btn-merge-run');
    if (btnMergeRun) {
        btnMergeRun.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>
            Merge Files
        `;
        btnMergeRun.style.background = "";
        btnMergeRun.style.borderColor = "";
    }
}

// Recalculate Groups Map & Unique Keys
function recalculateMergeGroups() {
    mrgGroupsMap = new Map();
    mrgUniqueGroups = [];

    mrgUploadedFiles.forEach(fileObj => {
        const key = fileObj.groupKey || "Other";
        if (!mrgGroupsMap.has(key)) {
            mrgGroupsMap.set(key, []);
            mrgUniqueGroups.push(key);
        }
        mrgGroupsMap.get(key).push(fileObj);
    });

    mrgUniqueGroups.sort();
}

// Handle selected merge files
async function handleMrgFileSelection(files) {
    resetMergeButtonState();
    if (!files || files.length === 0) return;

    const mrgProgress = document.getElementById('mrg-progress');
    const mrgProgressPercent = document.getElementById('mrg-progress-percent');
    const mrgProgressText = document.getElementById('mrg-progress-text');
    const mrgProgressFill = document.getElementById('mrg-progress-fill');

    if (mrgProgress) mrgProgress.classList.remove('hidden');
    const updateMrgProgress = (percent, text) => {
        if (mrgProgressPercent) mrgProgressPercent.textContent = `${Math.round(percent)}%`;
        if (mrgProgressFill) mrgProgressFill.style.width = `${percent}%`;
        if (mrgProgressText && text) mrgProgressText.textContent = text;
    };

    updateMrgProgress(5, "Reading uploaded files...");
    mrgUploadedFiles = [];
    mrgNextId = 1;

    try {
        const flatFilesList = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const ext = file.name.split('.').pop().toLowerCase();
            
            if (ext === 'zip') {
                updateMrgProgress(10, `Extracting ZIP: ${file.name}...`);
                const extracted = await extractSpreadsheetsFromZip(file);
                flatFilesList.push(...extracted);
            } else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
                flatFilesList.push({
                    name: file.name,
                    ext: ext,
                    blob: file
                });
            }
        }

        if (flatFilesList.length === 0) {
            if (mrgProgress) mrgProgress.classList.add('hidden');
            showToast("No valid Excel or CSV files found.", "error");
            return;
        }

        for (let i = 0; i < flatFilesList.length; i++) {
            const fileData = flatFilesList[i];
            const fileProgress = 5 + Math.round((i / flatFilesList.length) * 85);
            updateMrgProgress(fileProgress, `Parsing: ${fileData.name}...`);
            await new Promise(r => setTimeout(r, 10));

            // Extract group key: part before the hyphen "-"
            const baseName = fileData.name.substring(0, fileData.name.lastIndexOf('.')) || fileData.name;
            const parts = baseName.split('-');
            const groupKey = parts[0].trim();

            const fileObj = {
                id: mrgNextId++,
                name: fileData.name,
                fileObj: fileData.blob,
                ext: fileData.ext,
                groupKey: groupKey,
                aoa: []
            };

            // Parse AOA structure
            fileObj.aoa = await readExcelAsAOA(fileData.blob);
            mrgUploadedFiles.push(fileObj);
        }

        updateMrgProgress(95, "Grouping files by prefix key...");
        await new Promise(r => setTimeout(r, 20));

        recalculateMergeGroups();
        renderMergePreview();
        saveMergeSessionToStorage();

        updateMrgProgress(100, "Done!");
        showToast(`${mrgUploadedFiles.length} files loaded for merging!`, "success");
        
        setTimeout(() => {
            if (mrgProgress) {
                mrgProgress.classList.add('hidden');
                if (mrgProgressPercent) mrgProgressPercent.textContent = "0%";
                if (mrgProgressFill) mrgProgressFill.style.width = "0%";
                if (mrgProgressText) mrgProgressText.textContent = "Processing merge...";
            }
        }, 1200);

    } catch (err) {
        console.error(err);
        showToast("Error reading files: " + err.message, "error");
        if (mrgProgress) mrgProgress.classList.add('hidden');
    }
}

// Render preview list in main tab
function renderMergePreview() {
    const mrgGroupCount = document.getElementById('mrg-group-count');
    const mrgPreviewTbody = document.getElementById('mrg-preview-tbody');
    const mrgEmptyState = document.getElementById('mrg-empty-state');
    const mrgTableContainer = document.getElementById('mrg-table-container');
    const btnMergeRun = document.getElementById('btn-merge-run');
    const mrgHeaderActions = document.getElementById('mrg-header-actions');
    const mrgFileLabel = document.getElementById('mrg-file-label');

    if (mrgGroupCount) mrgGroupCount.textContent = `${mrgUniqueGroups.length} groups detected (${mrgUploadedFiles.length} files)`;
    if (mrgFileLabel) mrgFileLabel.textContent = mrgUploadedFiles.length > 0 ? `${mrgUploadedFiles.length} files loaded` : "Drag & Drop files here";

    if (mrgUniqueGroups.length === 0) {
        if (mrgEmptyState) mrgEmptyState.classList.remove('hidden');
        if (mrgTableContainer) mrgTableContainer.classList.add('hidden');
        if (btnMergeRun) btnMergeRun.classList.add('hidden');
        if (mrgHeaderActions) mrgHeaderActions.classList.add('hidden');
        if (mrgPreviewTbody) mrgPreviewTbody.innerHTML = '';
        return;
    }

    if (mrgEmptyState) mrgEmptyState.classList.add('hidden');
    if (mrgTableContainer) mrgTableContainer.classList.remove('hidden');
    if (btnMergeRun) btnMergeRun.classList.remove('hidden');
    if (mrgHeaderActions) mrgHeaderActions.classList.remove('hidden');

    if (!mrgPreviewTbody) return;
    mrgPreviewTbody.innerHTML = '';

    mrgUniqueGroups.forEach((key, idx) => {
        const filesInGroup = mrgGroupsMap.get(key) || [];
        const sourceNames = filesInGroup.map(f => f.name).join(', ');
        const outputFilename = `${key}-DropShipOrderReports-MYNTRA-${key}.xlsx`;

        const tr = document.createElement('tr');
        tr.className = `row-color-${idx % 7}`;

        tr.innerHTML = `
            <td><strong>${idx + 1}</strong></td>
            <td><span class="badge badge-dt" style="font-weight: 700;">${key}</span></td>
            <td>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span style="font-weight: 600; color: var(--text-primary); font-size: 0.76rem;">${filesInGroup.length} files</span>
                    <span class="file-name" style="font-size: 0.72rem; color: var(--text-secondary); max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${sourceNames}">${sourceNames}</span>
                </div>
            </td>
            <td><span style="color: var(--primary); font-weight: 600; font-size: 0.78rem;">${outputFilename}</span></td>
            <td style="text-align: center;">
                <div style="display: inline-flex; gap: 4px;">
                    <button class="btn-action btn-inspect-group" title="Inspect source files (first 50 rows)" style="width: 24px; height: 24px; border-radius: 6px; border: none; background: rgba(124, 58, 237, 0.08); color: var(--primary); cursor: pointer;">
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    </button>
                    <button class="btn-action btn-edit-group-key" title="Edit Group Key (regroup files)" style="width: 24px; height: 24px; border-radius: 6px; border: none; background: rgba(5, 150, 105, 0.08); color: #059669; cursor: pointer;">
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="btn-action btn-del-group" title="Delete Group" style="width: 24px; height: 24px; border-radius: 6px; border: none; background: rgba(220, 38, 38, 0.08); color: var(--color-danger); cursor: pointer;">
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </td>
        `;

        const btnInspect = tr.querySelector('.btn-inspect-group');
        if (btnInspect) {
            btnInspect.addEventListener('click', () => {
                if (filesInGroup.length > 0) openRenFileInspector(filesInGroup[0]);
            });
        }

        const btnEdit = tr.querySelector('.btn-edit-group-key');
        if (btnEdit) {
            btnEdit.addEventListener('click', () => openEditGroupKeyModal(key));
        }

        const btnDel = tr.querySelector('.btn-del-group');
        if (btnDel) {
            btnDel.addEventListener('click', () => {
                showDeleteConfirmation({
                    title: `Delete Group "${key}"?`,
                    message: `Are you sure you want to delete group "${key}" (${filesInGroup.length} file${filesInGroup.length === 1 ? '' : 's'})?`,
                    onConfirm: () => removeMergeGroup(key)
                });
            });
        }

        mrgPreviewTbody.appendChild(tr);
    });
}

// Remove an entire group from merge
function removeMergeGroup(groupKey) {
    mrgUploadedFiles = mrgUploadedFiles.filter(f => f.groupKey !== groupKey);
    recalculateMergeGroups();
    resetMergeButtonState();
    renderMergePreview();
    const fullviewModal = document.getElementById('mrg-fullview-modal');
    if (fullviewModal && fullviewModal.classList.contains('show')) {
        renderMrgFullViewModalRows();
    }
    saveMergeSessionToStorage();
    showToast(`Group "${groupKey}" deleted.`, "info");
}

// Remove an individual file from merge queue
function removeMergeFile(fileId) {
    const file = mrgUploadedFiles.find(f => f.id === fileId);
    const fileName = file ? file.name : "File";
    showDeleteConfirmation({
        title: `Delete File "${fileName}"?`,
        message: `Are you sure you want to delete this file from merge queue?`,
        onConfirm: () => {
            mrgUploadedFiles = mrgUploadedFiles.filter(f => f.id !== fileId);
            recalculateMergeGroups();
            resetMergeButtonState();
            renderMergePreview();
            const fullviewModal = document.getElementById('mrg-fullview-modal');
            if (fullviewModal && fullviewModal.classList.contains('show')) {
                renderMrgFullViewModalRows();
            }
            saveMergeSessionToStorage();
            showToast(`File deleted from merge queue.`, "info");
        }
    });
}

// Open Full View Modal for Merge Tab
function openMrgFullViewModal() {
    const modal = document.getElementById('mrg-fullview-modal');
    const searchInput = document.getElementById('mrg-fullview-search');
    if (!modal) return;
    if (searchInput) searchInput.value = '';
    renderMrgFullViewModalRows();
    modal.classList.add('show');
    modal.classList.remove('hidden');
}

function closeMrgFullViewModal() {
    const modal = document.getElementById('mrg-fullview-modal');
    if (modal) {
        modal.classList.remove('show');
        modal.classList.add('hidden');
    }
}

function renderMrgFullViewModalRows() {
    const tbody = document.getElementById('tbody-mrg-fullview-files');
    const countTag = document.getElementById('mrg-fullview-count');
    const searchInput = document.getElementById('mrg-fullview-search');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

    if (!tbody) return;
    tbody.innerHTML = '';

    let groups = [...mrgUniqueGroups];
    if (query) {
        groups = groups.filter(key => {
            if (key.toLowerCase().includes(query)) return true;
            const files = mrgGroupsMap.get(key) || [];
            return files.some(f => f.name.toLowerCase().includes(query));
        });
    }

    if (countTag) countTag.textContent = `${groups.length} groups (${mrgUploadedFiles.length} files)`;

    if (groups.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No matching groups found.</td></tr>`;
        return;
    }

    groups.forEach((key, idx) => {
        const filesInGroup = mrgGroupsMap.get(key) || [];
        const sourceNames = filesInGroup.map(f => f.name).join(', ');
        const outputFilename = `${key}-DropShipOrderReports-MYNTRA-${key}.xlsx`;

        const tr = document.createElement('tr');
        tr.className = `row-color-${idx % 7}`;

        tr.innerHTML = `
            <td><strong>${idx + 1}</strong></td>
            <td><span class="badge badge-dt" style="font-weight: 700; font-size: 0.8rem;">${key}</span></td>
            <td>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <span style="font-weight: 700; color: var(--text-primary); font-size: 0.78rem;">${filesInGroup.length} Source Files:</span>
                    <ul style="margin: 0; padding-left: 1.1rem; font-size: 0.74rem; color: var(--text-secondary);">
                        ${filesInGroup.map(f => `<li><span class="file-name btn-inspect-one" data-fileid="${f.id}" style="cursor: pointer; text-decoration: underline dotted;" title="Click to inspect 50 rows">${f.name}</span></li>`).join('')}
                    </ul>
                </div>
            </td>
            <td><span style="color: var(--primary); font-weight: 600; font-size: 0.82rem;">${outputFilename}</span></td>
            <td style="text-align: center;">
                <div style="display: inline-flex; gap: 5px;">
                    <button class="btn-action btn-inspect-group" title="Inspect first 50 rows" style="width: 26px; height: 26px; border-radius: 6px; border: none; background: rgba(124, 58, 237, 0.08); color: var(--primary); cursor: pointer;">
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    </button>
                    <button class="btn-action btn-edit-group-key" title="Edit Group Key (regroup)" style="width: 26px; height: 26px; border-radius: 6px; border: none; background: rgba(5, 150, 105, 0.08); color: #059669; cursor: pointer;">
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="btn-action btn-del-group" title="Delete Group" style="width: 26px; height: 26px; border-radius: 6px; border: none; background: rgba(220, 38, 38, 0.08); color: var(--color-danger); cursor: pointer;">
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </td>
        `;

        tr.querySelectorAll('.btn-inspect-one').forEach(elem => {
            elem.addEventListener('click', (e) => {
                const fileId = parseInt(elem.getAttribute('data-fileid'), 10);
                const targetFile = filesInGroup.find(f => f.id === fileId);
                if (targetFile) openRenFileInspector(targetFile);
            });
        });

        const btnInspect = tr.querySelector('.btn-inspect-group');
        if (btnInspect) {
            btnInspect.addEventListener('click', () => {
                if (filesInGroup.length > 0) openRenFileInspector(filesInGroup[0]);
            });
        }

        const btnEdit = tr.querySelector('.btn-edit-group-key');
        if (btnEdit) {
            btnEdit.addEventListener('click', () => openEditGroupKeyModal(key));
        }

        const btnDel = tr.querySelector('.btn-del-group');
        if (btnDel) {
            btnDel.addEventListener('click', () => {
                showDeleteConfirmation({
                    title: `Delete Group "${key}"?`,
                    message: `Are you sure you want to delete group "${key}" (${filesInGroup.length} file${filesInGroup.length === 1 ? '' : 's'})?`,
                    onConfirm: () => removeMergeGroup(key)
                });
            });
        }

        tbody.appendChild(tr);
    });
}

// Edit Group Key Modal functions
function openEditGroupKeyModal(groupKey) {
    mrgActiveEditGroupKey = groupKey;
    const modal = document.getElementById('edit-group-key-modal');
    const currElem = document.getElementById('edit-group-key-current');
    const inputElem = document.getElementById('edit-group-key-input');

    if (!modal) return;
    if (currElem) currElem.textContent = groupKey;
    if (inputElem) {
        inputElem.value = groupKey;
        setTimeout(() => inputElem.focus(), 100);
    }

    modal.classList.add('show');
    modal.classList.remove('hidden');
}

function closeEditGroupKeyModal() {
    const modal = document.getElementById('edit-group-key-modal');
    if (modal) {
        modal.classList.remove('show');
        modal.classList.add('hidden');
    }
    mrgActiveEditGroupKey = null;
}

function saveEditGroupKey() {
    if (!mrgActiveEditGroupKey) return;
    const inputElem = document.getElementById('edit-group-key-input');
    const newKey = inputElem ? inputElem.value.trim() : "";

    if (!newKey) {
        showToast("Please enter a valid group key.", "error");
        return;
    }

    const oldKey = mrgActiveEditGroupKey;
    mrgUploadedFiles.forEach(file => {
        if (file.groupKey === oldKey) {
            file.groupKey = newKey;
            // Update filename prefix if filename started with old key
            const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            const ext = file.ext ? `.${file.ext}` : '';
            const parts = baseName.split('-');
            if (parts.length > 1) {
                parts[0] = newKey;
                file.name = parts.join('-') + ext;
            }
        }
    });

    recalculateMergeGroups();
    resetMergeButtonState();
    renderMergePreview();
    const fullviewModal = document.getElementById('mrg-fullview-modal');
    if (fullviewModal && fullviewModal.classList.contains('show')) {
        renderMrgFullViewModalRows();
    }
    saveMergeSessionToStorage();
    closeEditGroupKeyModal();
    showToast(`Group key changed from "${oldKey}" to "${newKey}"!`, "success");
}

// Move to Folder Create Tab from Merge Tab
async function moveToFolderCreateFromMerge() {
    if (mrgUniqueGroups.length === 0) {
        showToast("No merged groups available to move.", "error");
        return;
    }

    const mrgProgress = document.getElementById('mrg-progress');
    const mrgProgressPercent = document.getElementById('mrg-progress-percent');
    const mrgProgressText = document.getElementById('mrg-progress-text');
    const mrgProgressFill = document.getElementById('mrg-progress-fill');

    if (mrgProgress) mrgProgress.classList.remove('hidden');
    const updateProgress = (pct, txt) => {
        if (mrgProgressPercent) mrgProgressPercent.textContent = `${Math.round(pct)}%`;
        if (mrgProgressFill) mrgProgressFill.style.width = `${pct}%`;
        if (mrgProgressText) mrgProgressText.textContent = txt;
    };

    updateProgress(15, "Generating merged Excel files for Folder Create...");
    await new Promise(r => setTimeout(r, 40));

    try {
        const mergedFilesForFolder = [];

        for (let i = 0; i < mrgUniqueGroups.length; i++) {
            const key = mrgUniqueGroups[i];
            const filesInGroup = mrgGroupsMap.get(key) || [];
            
            const progressPct = 15 + Math.round((i / mrgUniqueGroups.length) * 75);
            updateProgress(progressPct, `Processing group: ${key}...`);
            await new Promise(r => setTimeout(r, 10));

            const mergedRows = [];
            let headerWritten = false;

            for (let fIdx = 0; fIdx < filesInGroup.length; fIdx++) {
                const file = filesInGroup[fIdx];
                let aoa = file.aoa;
                if (!aoa || aoa.length === 0) {
                    aoa = await readExcelAsAOA(file.fileObj);
                }
                if (!aoa || aoa.length === 0) continue;

                if (!headerWritten) {
                    for (let r = 0; r < aoa.length; r++) {
                        mergedRows.push([...aoa[r]]);
                    }
                    headerWritten = true;
                } else {
                    if (aoa.length > 1) {
                        for (let r = 1; r < aoa.length; r++) {
                            mergedRows.push([...aoa[r]]);
                        }
                    }
                }
            }

            const ws = XLSX.utils.aoa_to_sheet(mergedRows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
            const arrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const outputName = `${key}-DropShipOrderReports-MYNTRA-${key}.xlsx`;
            const fileObj = new File([arrayBuffer], outputName, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            mergedFilesForFolder.push(fileObj);
        }

        updateProgress(100, "Done!");
        setTimeout(() => {
            if (mrgProgress) mrgProgress.classList.add('hidden');
        }, 800);

        // Pass merged files to Folder Create handler
        handleFldFileSelection(mergedFilesForFolder);

        // Switch active tab to Folder Create
        const folderTabBtn = document.getElementById('btn-folder-create-tab') || document.querySelector('.tab-btn[data-tab="tab-folder-create"]');
        if (folderTabBtn) folderTabBtn.click();

        showToast(`${mergedFilesForFolder.length} merged files transferred to Folder Create tab!`, "success");

    } catch (err) {
        console.error(err);
        if (mrgProgress) mrgProgress.classList.add('hidden');
        showToast("Error moving to Folder Create: " + err.message, "error");
    }
}

// Run the merge and download process
async function runMergeProcess() {
    if (mrgUniqueGroups.length === 0) return;

    const btnMergeRun = document.getElementById('btn-merge-run');

    // If already generated, download directly
    if (mrgSingleFileBlob) {
        const url = URL.createObjectURL(mrgSingleFileBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = mrgSingleFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);

        showToast("Excel downloaded successfully!", "success");
        return;
    } else if (mrgGeneratedZipBlob) {
        const url = URL.createObjectURL(mrgGeneratedZipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = mrgGeneratedZipName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);

        showToast("ZIP downloaded successfully!", "success");
        return;
    }

    const mrgProgress = document.getElementById('mrg-progress');
    const mrgProgressPercent = document.getElementById('mrg-progress-percent');
    const mrgProgressText = document.getElementById('mrg-progress-text');
    const mrgProgressFill = document.getElementById('mrg-progress-fill');

    if (btnMergeRun) btnMergeRun.disabled = true;
    if (mrgProgress) mrgProgress.classList.remove('hidden');

    const updateMrgProgress = (percent, text) => {
        if (mrgProgressPercent) mrgProgressPercent.textContent = `${Math.round(percent)}%`;
        if (mrgProgressFill) mrgProgressFill.style.width = `${percent}%`;
        if (mrgProgressText && text) mrgProgressText.textContent = text;
    };

    updateMrgProgress(10, "Merging file groups...");
    await new Promise(r => setTimeout(r, 50));

    try {
        const zip = new JSZip();

        for (let i = 0; i < mrgUniqueGroups.length; i++) {
            const key = mrgUniqueGroups[i];
            const filesInGroup = mrgGroupsMap.get(key) || [];
            
            const fileProgress = 10 + Math.round((i / mrgUniqueGroups.length) * 80);
            updateMrgProgress(fileProgress, `Merging group: ${key} (${i + 1}/${mrgUniqueGroups.length})...`);
            await new Promise(r => setTimeout(r, 20));

            const mergedRows = [];
            let headerWritten = false;

            for (let fIdx = 0; fIdx < filesInGroup.length; fIdx++) {
                const file = filesInGroup[fIdx];
                let aoa = file.aoa;
                if (!aoa || aoa.length === 0) {
                    aoa = await readExcelAsAOA(file.fileObj);
                }
                if (!aoa || aoa.length === 0) continue;

                if (!headerWritten) {
                    for (let r = 0; r < aoa.length; r++) {
                        mergedRows.push([...aoa[r]]);
                    }
                    headerWritten = true;
                } else {
                    if (aoa.length > 1) {
                        for (let r = 1; r < aoa.length; r++) {
                            mergedRows.push([...aoa[r]]);
                        }
                    }
                }
            }

            const ws = XLSX.utils.aoa_to_sheet(mergedRows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
            
            const arrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const fileBlob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            const outputName = `${key}-DropShipOrderReports-MYNTRA-${key}.xlsx`;

            if (mrgUniqueGroups.length === 1) {
                mrgSingleFileBlob = fileBlob;
                mrgSingleFileName = outputName;
            } else {
                zip.file(outputName, fileBlob);
            }
        }

        updateMrgProgress(95, "Generating output package...");
        await new Promise(r => setTimeout(r, 50));

        let isSingle = (mrgUniqueGroups.length === 1);
        if (!isSingle) {
            mrgGeneratedZipBlob = await zip.generateAsync({ type: "blob" });
            mrgGeneratedZipName = "myntra_merge_file.zip";
        }

        updateMrgProgress(100, "Success!");
        showToast("Files merged successfully! Click Download to save.", "success");

        setTimeout(() => {
            if (mrgProgress) {
                mrgProgress.classList.add('hidden');
                if (mrgProgressPercent) mrgProgressPercent.textContent = "0%";
                if (mrgProgressFill) mrgProgressFill.style.width = "0%";
                if (mrgProgressText) mrgProgressText.textContent = "Processing merge...";
            }
            
            if (btnMergeRun) {
                btnMergeRun.disabled = false;
                if (isSingle) {
                    btnMergeRun.innerHTML = `
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Download Merged Excel
                    `;
                } else {
                    btnMergeRun.innerHTML = `
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Download Merged ZIP
                    `;
                }
                btnMergeRun.style.background = "var(--color-od)";
                btnMergeRun.style.borderColor = "var(--color-od)";
            }
        }, 1200);

    } catch (err) {
        console.error(err);
        showToast("Error merging files: " + err.message, "error");
        if (mrgProgress) mrgProgress.classList.add('hidden');
        if (btnMergeRun) btnMergeRun.disabled = false;
    }
}

      // ==========================================
// MYNTRA ERROR TAB OPERATIONS
// ==========================================

let errDetailsFile = null;
let errDataFile = null;
let errGeneratedZipBlob = null;
let errGeneratedZipName = "";

function setupMyntraError() {
    // Sub-tab Navigation (Sale vs Purchase)
    const meSubTabBtns = document.querySelectorAll('.me-subtab-btn');
    meSubTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetSubTabId = btn.getAttribute('data-me-subtab');
            meSubTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const salePane = document.getElementById('me-subtab-sale');
            const purchasePane = document.getElementById('me-subtab-purchase');

            if (targetSubTabId === 'me-subtab-sale') {
                if (salePane) {
                    salePane.classList.add('active-pane');
                    salePane.style.display = 'block';
                }
                if (purchasePane) {
                    purchasePane.classList.remove('active-pane');
                    purchasePane.style.display = 'none';
                }
            } else {
                if (salePane) {
                    salePane.classList.remove('active-pane');
                    salePane.style.display = 'none';
                }
                if (purchasePane) {
                    purchasePane.classList.add('active-pane');
                    purchasePane.style.display = 'block';
                }
            }
        });
    });

    setupPurchaseError();

    const detailsDropzone = document.getElementById('err-details-dropzone');
    const detailsInput = document.getElementById('err-details-file-input');
    const dataDropzone = document.getElementById('err-data-dropzone');
    const dataInput = document.getElementById('err-data-file-input');
    const btnErrorRun = document.getElementById('btn-error-run');

    if (!detailsDropzone || !detailsInput || !dataDropzone || !dataInput) return;

    // Details File Click
    detailsDropzone.addEventListener('click', () => {
        detailsInput.click();
    });
    detailsInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleErrFile(e.target.files[0], 'details');
        }
    });

    // Details File Drag & Drop
    detailsDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        detailsDropzone.classList.add('dragover');
    });
    detailsDropzone.addEventListener('dragleave', () => {
        detailsDropzone.classList.remove('dragover');
    });
    detailsDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        detailsDropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleErrFile(e.dataTransfer.files[0], 'details');
        }
    });

    // Data File Click
    dataDropzone.addEventListener('click', () => {
        dataInput.click();
    });
    dataInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleErrFile(e.target.files[0], 'data');
        }
    });

    // Data File Drag & Drop
    dataDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dataDropzone.classList.add('dragover');
    });
    dataDropzone.addEventListener('dragleave', () => {
        dataDropzone.classList.remove('dragover');
    });
    dataDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dataDropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleErrFile(e.dataTransfer.files[0], 'data');
        }
    });

    // Run / Download Action Trigger
    if (btnErrorRun) {
        btnErrorRun.addEventListener('click', () => {
            if (errGeneratedZipBlob) {
                // User-triggered download of already generated ZIP
                const url = URL.createObjectURL(errGeneratedZipBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = errGeneratedZipName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                showToast("ZIP package downloaded successfully!", "success");
            } else {
                runErrorCheckProcess();
            }
        });
    }
}

function resetErrorButtonState() {
    errGeneratedZipBlob = null;
    errGeneratedZipName = "";
    const btnErrorRun = document.getElementById('btn-error-run');
    if (btnErrorRun) {
        btnErrorRun.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            Process Myntra Errors
        `;
        btnErrorRun.style.background = ""; // Restore default styles
        btnErrorRun.style.borderColor = "";
    }
}

function handleErrFile(file, type) {
    if (!file) return;

    // Reset download state if new files are uploaded
    resetErrorButtonState();

    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv') {
        showToast("Please upload an Excel or CSV file.", "error");
        return;
    }

    if (type === 'details') {
        errDetailsFile = file;
        const label = document.getElementById('err-details-label');
        if (label) label.textContent = file.name;
        const tag = document.getElementById('err-details-tag');
        if (tag) {
            tag.textContent = "Loaded";
            tag.style.background = "rgba(16, 185, 129, 0.1)";
            tag.style.color = "#10b981";
        }
    } else if (type === 'data') {
        errDataFile = file;
        const label = document.getElementById('err-data-label');
        if (label) label.textContent = file.name;
        const tag = document.getElementById('err-data-tag');
        if (tag) {
            tag.textContent = "Loaded";
            tag.style.background = "rgba(16, 185, 129, 0.1)";
            tag.style.color = "#10b981";
        }
    }

    renderErrorPreview();
    showToast(`${file.name} uploaded successfully!`, "success");
}

function renderErrorPreview() {
    const errFileCount = document.getElementById('err-file-count');
    const errPreviewTbody = document.getElementById('err-preview-tbody');
    const errEmptyState = document.getElementById('err-empty-state');
    const errTableContainer = document.getElementById('err-table-container');
    const btnErrorRun = document.getElementById('btn-error-run');

    let filesCount = 0;
    if (errDetailsFile) filesCount++;
    if (errDataFile) filesCount++;

    if (errFileCount) {
        errFileCount.textContent = `${filesCount} files loaded`;
    }

    if (errPreviewTbody) {
        errPreviewTbody.innerHTML = '';
    }

    if (filesCount === 0) {
        if (errEmptyState) errEmptyState.classList.remove('hidden');
        if (errTableContainer) errTableContainer.classList.add('hidden');
        if (btnErrorRun) btnErrorRun.classList.add('hidden');
        return;
    }

    if (errEmptyState) errEmptyState.classList.add('hidden');
    if (errTableContainer) errTableContainer.classList.remove('hidden');

    if (filesCount === 2) {
        if (btnErrorRun) btnErrorRun.classList.remove('hidden');
    } else {
        if (btnErrorRun) btnErrorRun.classList.add('hidden');
    }

    const filesToRender = [];
    if (errDetailsFile) filesToRender.push({ type: 'Myntra Details', file: errDetailsFile });
    if (errDataFile) filesToRender.push({ type: 'Myntra Data', file: errDataFile });

    filesToRender.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.className = `row-color-${idx % 7}`;
        
        tr.innerHTML = `
            <td><strong>${idx + 1}</strong></td>
            <td><span class="file-name" title="${item.file.name}">${item.file.name} (${item.type})</span></td>
            <td><span style="color: var(--text-secondary); font-weight: 500;">—</span></td>
            <td><span class="badge badge-unmatched">Ready to check</span></td>
        `;
        if (errPreviewTbody) {
            errPreviewTbody.appendChild(tr);
        }
    });
}

async function runErrorCheckProcess() {
    if (!errDetailsFile || !errDataFile) {
        showToast("Please upload both Details and Data files first.", "error");
        return;
      }

    const errProgress = document.getElementById('err-progress');
    const errProgressPercent = document.getElementById('err-progress-percent');
    const errProgressText = document.getElementById('err-progress-text');
    const errProgressFill = document.getElementById('err-progress-fill');
    const btnErrorRun = document.getElementById('btn-error-run');

    if (btnErrorRun) btnErrorRun.disabled = true;
    if (errProgress) errProgress.classList.remove('hidden');

    const updateErrProgress = (percent, text) => {
        if (errProgressPercent) errProgressPercent.textContent = `${Math.round(percent)}%`;
        if (errProgressFill) errProgressFill.style.width = `${percent}%`;
        if (text && errProgressText) errProgressText.textContent = text;
    };

    try {
        // Retrieve date filters from UI
        const fromDateStr = document.getElementById('err-from-date').value;
        const toDateStr = document.getElementById('err-to-date').value;

        const fromDate = fromDateStr ? new Date(fromDateStr) : null;
        const toDate = toDateStr ? new Date(toDateStr) : null;

        if (fromDate) fromDate.setHours(0, 0, 0, 0);
        if (toDate) toDate.setHours(23, 59, 59, 999);

        updateErrProgress(10, "Reading Myntra Details file...");
        await new Promise(r => setTimeout(r, 150));
        const detailsAOA = await readExcelAsAOA(errDetailsFile);

        updateErrProgress(20, "Reading Myntra Data file...");
        await new Promise(r => setTimeout(r, 150));
        const dataAOA = await readExcelAsAOA(errDataFile);

        if (detailsAOA.length === 0) {
            throw new Error("Details file is empty.");
        }
        if (dataAOA.length === 0) {
            throw new Error("Data file is empty.");
        }

        // Determine correct header row for Details
        let headerRowIndex = 0;
        if (detailsAOA[1] && String(detailsAOA[1][1]).toLowerCase().includes("invoice")) {
            headerRowIndex = 1;
        }
        const headerDetails = detailsAOA[headerRowIndex];

        updateErrProgress(30, "Filtering rows in Details (Column V)...");
        await new Promise(r => setTimeout(r, 200));

        // Details AOA check: Column V (index 21). Delete row if value is "0" or "Price Dispute : 0".
        const filteredDetailsRows = [];
        let deletedRowCount = 0;
        for (let i = headerRowIndex + 1; i < detailsAOA.length; i++) {
            const row = detailsAOA[i];
            const valV = row[21] !== undefined ? String(row[21]).trim() : "";
            if (valV === "0" || valV === "Price Dispute : 0") {
                deletedRowCount++;
            } else {
                filteredDetailsRows.push(row);
            }
        }

        updateErrProgress(45, "Creating mapping index from Data (Column E -> Column C)...");
        await new Promise(r => setTimeout(r, 200));

        // Data AOA: Map Column E (index 4) -> Column C (index 2)
        const dataMap = new Map();
        for (let j = 1; j < dataAOA.length; j++) {
            const row = dataAOA[j];
            const keyE = row[4] !== undefined ? cleanKey(row[4]) : "";
            if (keyE) {
                const valC = row[2] !== undefined ? row[2] : "";
                dataMap.set(keyE, valC);
            }
        }

        updateErrProgress(60, "Mapping matching values & checking date filters...");
        await new Promise(r => setTimeout(r, 250));

        // Details AOA: Map Column B (index 1) -> Column W (index 22) and check Date Range
        let mappedCount = 0;
        let dateFilteredCount = 0;
        const survivingRows = [];

        for (let i = 0; i < filteredDetailsRows.length; i++) {
            const row = filteredDetailsRows[i];
            const keyB = row[1] !== undefined ? cleanKey(row[1]) : "";
            
            while (row.length < 23) {
                row.push("");
            }
            
            let cellValC = "";
            if (keyB && dataMap.has(keyB)) {
                cellValC = dataMap.get(keyB);
                mappedCount++;
            }
            row[22] = cellValC;

            // Date filter check
            if (fromDate || toDate) {
                const cellDate = parseCellAsDate(cellValC);
                if (cellDate) {
                    let inRange = true;
                    if (fromDate && cellDate < fromDate) inRange = false;
                    if (toDate && cellDate > toDate) inRange = false;

                    if (inRange) {
                        dateFilteredCount++;
                        continue; // delete/skip row
                    }
                }
            }

            survivingRows.push(row);
        }

        updateErrProgress(70, "Grouping error rows by Warehouse Name (Column D)...");
        await new Promise(r => setTimeout(r, 200));

        // Group survivingRows by Column D (index 3)
        const partyGroups = new Map();
        survivingRows.forEach(row => {
            const partyKey = String(row[3] || "").trim();
            if (partyKey) {
                if (!partyGroups.has(partyKey)) {
                    partyGroups.set(partyKey, []);
                }
                partyGroups.get(partyKey).push(row);
            }
        });

        // Initialize ZIP and Master Workbook
        const zip = new JSZip();
        const masterWb = XLSX.utils.book_new();
        const partyKeysSorted = Array.from(partyGroups.keys()).sort();

        updateErrProgress(80, "Calculating correct prices & compiling sheets...");
        await new Promise(r => setTimeout(r, 250));

        partyKeysSorted.forEach(partyKey => {
            const rowsInGroup = partyGroups.get(partyKey);

            // Row 1 (index 0): Merged A1:L1 title block
            const titleRow = [`${partyKey}-price dispute`, "", "", "", "", "", "", "", "", "", "", ""];

            // Row 2 (index 1): Column Headers matching screenshot exactly
            const colAHeader = "Invoice No";
            const colBHeader = "Invoice Date";
            const colCHeader = "Warehouse Name";
            const colDHeader = "Order ID";
            const colEHeader = "Item Asin";
            const colFHeader = "Item SKU";
            const colGHeader = "Quantity";
            const colHHeader = "Item Cost";
            const colIHeader = "Reason";
            const colJHeader = "Order Date";
            const colKHeader = "Calculated Price";
            const colLHeader = "Remarks";

            const groupHeaders = [
                colAHeader, colBHeader, colCHeader, colDHeader, colEHeader, colFHeader,
                colGHeader, colHHeader, colIHeader, colJHeader, colKHeader, colLHeader
            ];

            const sheetAOA = [titleRow, groupHeaders];

            rowsInGroup.forEach(row => {
                const valH = parseFloat(row[12]) || 0; // Details Column M (Item Cost)
                const valG = parseInt(row[11], 10) || 0; // Details Column L (Quantity)
                const disputeVal = parseDisputeAmount(row[21]); // Details Column V
                
                // Formula: valK = valH - disputeVal
                const valK = parseFloat((valH - disputeVal).toFixed(2));
                const valL = "this amount not coorect as account central price this is approx price that currently live in account central";

                const dataRow = [
                    row[1] || "",      // Details B (Invoice No)
                    row[2] || "",      // Details C (Invoice Date)
                    row[3] || "",      // Details D (Warehouse Name)
                    row[6] || "",      // Details G (Order ID)
                    row[7] || "",      // Details H (Item Asin)
                    row[8] || "",      // Details I (Item SKU)
                    valG,              // Details L (Quantity as number)
                    valH,              // Details M (Item Cost as number)
                    row[21] || "",     // Details V (Reason)
                    row[22] || "",     // Details W (Lookup Date)
                    valK,              // Calculated Price (number)
                    valL               // Remarks
                ];
                sheetAOA.push(dataRow);
            });

            // Convert to sheet and merge A1:L1
            const wsGroup = XLSX.utils.aoa_to_sheet(sheetAOA);
            wsGroup['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }];

            // Apply style objects, gridlines, auto-fit, decimals
            applyWorksheetFormatting(wsGroup, sheetAOA, true);

            // Sheet name max length 31 chars in Excel
            const sheetName = `${partyKey}-price dispute`.substring(0, 31);

            // 1. Create individual workbook
            const wbGroup = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wbGroup, wsGroup, sheetName);
            const bufferGroup = XLSX.write(wbGroup, { bookType: 'xlsx', type: 'array' });
            const blobGroup = new Blob([bufferGroup], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const groupFilename = `${partyKey}-price dispute.xlsx`;
            zip.file(groupFilename, blobGroup);

            // Register tracked error in database
            registerTrackedError('myntra', groupFilename, partyKey, 'Price Dispute', rowsInGroup.length);

            // 2. Add to combined master workbook
            XLSX.utils.book_append_sheet(masterWb, wsGroup, sheetName);
        });

        // Add master workbook to ZIP if there are sheets
        if (partyKeysSorted.length > 0) {
            // Apply formatting to master sheets as well (already styled above because we reuse wsGroup)
            const masterBuffer = XLSX.write(masterWb, { bookType: 'xlsx', type: 'array' });
            const masterBlob = new Blob([masterBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            zip.file("myntra price dispute.xlsx", masterBlob);
        }

        // Preserve top row(s) so header is placed at Row 2, data starting at Row 3 onwards (matching uploaded details file format)
        const topRows = headerRowIndex > 0 ? detailsAOA.slice(0, headerRowIndex) : [[]];
        const detailsCleaned = [...topRows, headerDetails, ...survivingRows];

        const wbDetails = XLSX.utils.book_new();
        const wsDetails = XLSX.utils.aoa_to_sheet(detailsCleaned);
        
        // Format Details worksheet
        applyWorksheetFormatting(wsDetails, detailsCleaned, false, headerRowIndex > 0 ? headerRowIndex : 1);

        XLSX.utils.book_append_sheet(wbDetails, wsDetails, "Processed_Details");
        const detailsBuffer = XLSX.write(wbDetails, { bookType: 'xlsx', type: 'array' });
        const detailsBlob = new Blob([detailsBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // Save using the original uploaded file's name
        zip.file(errDetailsFile.name, detailsBlob);

        // Package ZIP
        updateErrProgress(95, "Compiling final ZIP archive...");
        await new Promise(r => setTimeout(r, 150));

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const timestamp = new Date().toISOString().slice(0,10);
        
        // Save in state variables
        errGeneratedZipBlob = zipBlob;
        errGeneratedZipName = `myntra_price_dispute_bundle.zip`;

        updateErrProgress(100, "Success!");
        showToast(`ZIP created! Ready to download with ${partyKeysSorted.length} party files.`, "success");

        // Change button to download state
        if (btnErrorRun) {
            btnErrorRun.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Download Dispute ZIP
            `;
            btnErrorRun.style.background = "var(--color-od)"; // Purple/Indigo Glow
            btnErrorRun.style.borderColor = "var(--color-od)";
            btnErrorRun.disabled = false;
        }

        // Update UI preview table with file count results
        const errPreviewTbody = document.getElementById('err-preview-tbody');
        if (errPreviewTbody) {
            let rowHTML = `
                <tr class="row-color-0">
                    <td><strong>1</strong></td>
                    <td><span class="file-name" title="${errDetailsFile.name}">${errDetailsFile.name} (Cleaned Details)</span></td>
                    <td><span style="color: #ef4444; font-weight: bold;">${deletedRowCount + dateFilteredCount}</span></td>
                    <td><span class="badge" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2);">${deletedRowCount} (Col V) + ${dateFilteredCount} (Date Range) rows deleted</span></td>
                </tr>
                <tr class="row-color-1">
                    <td><strong>2</strong></td>
                    <td><span class="file-name" title="myntra price dispute.xlsx">myntra price dispute.xlsx (Master Merged)</span></td>
                    <td><span style="color: #10b981; font-weight: bold;">${partyKeysSorted.length}</span></td>
                    <td><span class="badge" style="background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2);">${partyKeysSorted.length} sheets combined</span></td>
                </tr>
            `;
            partyKeysSorted.forEach((partyKey, index) => {
                const count = partyGroups.get(partyKey).length;
                rowHTML += `
                    <tr class="row-color-${(index + 2) % 7}">
                        <td><strong>${index + 3}</strong></td>
                        <td><span class="file-name" title="${partyKey}-price dispute.xlsx">${partyKey}-price dispute.xlsx</span></td>
                        <td><span style="color: var(--primary); font-weight: bold;">${count}</span></td>
                        <td><span class="badge badge-od">${count} rows processed</span></td>
                    </tr>
                `;
            });
            errPreviewTbody.innerHTML = rowHTML;
        }

    } catch (err) {
        console.error(err);
        showToast("Error processing files: " + err.message, "error");
        updateErrProgress(100, "Error!");
        if (btnErrorRun) btnErrorRun.disabled = false;
    } finally {
        setTimeout(() => {
            if (errProgress) errProgress.classList.add('hidden');
        }, 1200);
    }
}

// Applies column auto-fit, gridlines, number formats, and custom header cell styling properties
function applyWorksheetFormatting(ws, sheetAOA, isGroupSheet, headerRowIdx = 0) {
    if (!ws || !sheetAOA || sheetAOA.length === 0) return;
    
    // 1. Force gridlines visibility
    ws['!views'] = [{ showGridLines: true }];

    // 2. Set Column Widths (Auto-fit with minimum padding)
    const colWidths = sheetAOA[0].map((_, colIndex) => {
        let maxLen = 10; // min width
        sheetAOA.forEach((row, rowIndex) => {
            // Skip Row 1 of group sheet since it is a merged title block
            if (isGroupSheet && rowIndex === 0) return;
            const val = row[colIndex];
            if (val !== undefined && val !== null && val !== "") {
                const str = String(val);
                if (str.length > maxLen) maxLen = str.length;
            }
        });
        return { wch: Math.min(maxLen + 3, 45) }; // cap column width at 45 chars max
    });
    ws['!cols'] = colWidths;

    // 3. Set Row Heights
    const rowHeights = [];
    if (isGroupSheet) {
        rowHeights.push({ hpt: 28 }); // Row 1: Merged Title (28pt)
        rowHeights.push({ hpt: 24 }); // Row 2: Headers (24pt)
        for (let r = 2; r < sheetAOA.length; r++) {
            rowHeights.push({ hpt: 20 }); // Data rows (20pt)
        }
    } else {
        rowHeights.push({ hpt: 20 }); // Row 1: Empty
        rowHeights.push({ hpt: 24 }); // Row 2: Details header (24pt)
        for (let r = 2; r < sheetAOA.length; r++) {
            rowHeights.push({ hpt: 20 }); // Details data rows (20pt)
        }
    }
    ws['!rows'] = rowHeights;

    // Alignments for party sheets
    const colAlignments = [
        "left",   // A: Invoice No
        "center", // B: Invoice Date
        "left",   // C: Warehouse Name
        "center", // D: Order ID
        "center", // E: Item Asin
        "left",   // F: Item SKU
        "center", // G: Quantity
        "right",  // H: Item Cost
        "left",   // I: Reason
        "center", // J: Order Date
        "right",  // K: Calculated Price
        "left"    // L: Remarks
    ];

    // 4. Format cells and set styling properties
    for (const cellKey in ws) {
        if (cellKey[0] === '!') continue;
        const cell = ws[cellKey];
        
        // Basic border styles
        const borderStyle = {
            top: { style: "thin", color: { rgb: "D1D5DB" } },
            bottom: { style: "thin", color: { rgb: "D1D5DB" } },
            left: { style: "thin", color: { rgb: "D1D5DB" } },
            right: { style: "thin", color: { rgb: "D1D5DB" } }
        };

        // Initialize cell style object
        cell.s = { border: borderStyle };

        // Parse coordinate to check headers
        const match = cellKey.match(/^([A-Z]+)(\d+)$/);
        if (match) {
            const col = match[1];
            const rowNum = parseInt(match[2], 10);
            const colIndex = XLSX.utils.decode_col(col);

            if (isGroupSheet) {
                if (rowNum === 1) {
                    // Row 1 (Merged Title): White background, black bold centered text, size 12
                    cell.s.fill = { fgColor: { rgb: "FFFFFF" } };
                    cell.s.font = { name: "Arial", sz: 12, bold: true, color: { rgb: "000000" } };
                    cell.s.alignment = { horizontal: "center", vertical: "center" };
                } else if (rowNum === 2) {
                    // Row 2 (Headers): Dark Blue background (#2F5597), white bold centered text, size 10
                    cell.s.fill = { fgColor: { rgb: "2F5597" } };
                    cell.s.font = { name: "Arial", sz: 10, bold: true, color: { rgb: "FFFFFF" } };
                    cell.s.alignment = { horizontal: "center", vertical: "center" };
                } else {
                    // Data rows: Arial 10pt with appropriate column alignments
                    cell.s.font = { name: "Arial", sz: 10, color: { rgb: "000000" } };
                    cell.s.alignment = { horizontal: colAlignments[colIndex] || "left", vertical: "center" };
                }
            } else {
                // Details sheet: Header at Row 2, data from Row 3
                const detailHeaderRowNum = 2;
                if (rowNum === detailHeaderRowNum) {
                    // Header Row: Dark Blue background (#2F5597), white bold text, size 10
                    cell.s.fill = { fgColor: { rgb: "2F5597" } };
                    cell.s.font = { name: "Arial", sz: 10, bold: true, color: { rgb: "FFFFFF" } };
                    cell.s.alignment = { horizontal: "left", vertical: "center" };
                } else if (rowNum < detailHeaderRowNum) {
                    // Row 1: Plain
                    cell.s.font = { name: "Arial", sz: 10, color: { rgb: "000000" } };
                } else {
                    // Data rows: Arial 10pt
                    cell.s.font = { name: "Arial", sz: 10, color: { rgb: "000000" } };
                    cell.s.alignment = { horizontal: "left", vertical: "center" };
                }
            }
        }
    }
}

// Parse dispute amount from Column V ("Price Dispute : X")
function parseDisputeAmount(val) {
    if (val === undefined || val === null) return 0;
    const str = String(val).trim();
    const match = str.match(/Price Dispute\s*:\s*(-?\d+(\.\d+)?)/i);
    if (match) {
        return parseFloat(match[1]);
    }
    const numMatch = str.match(/-?\d+(\.\d+)?/);
    if (numMatch) {
        return parseFloat(numMatch[0]);
    }
    return 0;
}

// Parse excel cell or string value to Date object robustly
function parseCellAsDate(val) {
    if (val === undefined || val === null || val === "") return null;
    if (val instanceof Date) return val;
    
    // Excel Serial Number
    if (!isNaN(Number(val)) && Number(val) > 20000) {
        return new Date((Number(val) - 25569) * 86400000);
    }
    
    const str = String(val).trim();
    if (!str) return null;

    // DD-MM-YYYY or YYYY-MM-DD Check
    const parts = str.split(' ')[0].split(/[-/]/);
    if (parts.length === 3) {
        let day, month, year;
        if (parts[0].length === 4) {
            // YYYY-MM-DD
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            day = parseInt(parts[2], 10);
        } else {
            // DD-MM-YYYY
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            year = parseInt(parts[2], 10);
        }
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
    }

    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
}

/* ==========================================================================
   HELPER UTILITIES FOR DROPZONES, FORMATTING & DOWNLOADS
   ========================================================================== */

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsArrayBuffer(file);
    });
}

function setupMiniDropzone(zone, input, callback) {
    if (!zone || !input) return;
    zone.addEventListener('click', (e) => {
        if (e.target !== input) input.click();
    });
    input.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    input.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            callback(e.target.files[0]);
        }
    });
    ['dragenter', 'dragover'].forEach(eventName => {
        zone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            zone.classList.add('dragover');
        });
    });
    ['dragleave', 'drop'].forEach(eventName => {
        zone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            zone.classList.remove('dragover');
        });
    });
    zone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
            callback(e.dataTransfer.files[0]);
        }
    });
}

function setupMultiDropzone(zone, input, callback) {
    if (!zone || !input) return;
    zone.addEventListener('click', (e) => {
        if (e.target !== input) input.click();
    });
    input.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    input.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            callback(Array.from(e.target.files));
        }
    });
    ['dragenter', 'dragover'].forEach(eventName => {
        zone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            zone.classList.add('dragover');
        });
    });
    ['dragleave', 'drop'].forEach(eventName => {
        zone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            zone.classList.remove('dragover');
        });
    });
    zone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
            callback(Array.from(e.dataTransfer.files));
        }
    });
}

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getFileIconClass(filename) {
    const ext = String(filename || "").split('.').pop().toLowerCase();
    if (ext === 'zip') return 'fa-solid fa-file-zipper text-purple';
    if (ext === 'csv') return 'fa-solid fa-file-csv text-teal';
    if (ext === 'xlsx' || ext === 'xls') return 'fa-solid fa-file-excel text-success';
    return 'fa-solid fa-file text-muted';
}

function toPureText(val) {
    if (val === undefined || val === null) return "";
    let str = String(val).trim();
    if (typeof val === 'number') {
        str = Number(val).toLocaleString('fullwide', { useGrouping: false });
    } else if (str.toLowerCase().includes('e')) {
        const num = Number(str);
        if (!isNaN(num)) {
            str = num.toLocaleString('fullwide', { useGrouping: false });
        }
    }
    if (str.includes('.') && /^\d+\.0+$/.test(str)) {
        str = str.split('.')[0];
    }
    return str;
}

function cleanPurchaseKeyVal(val) {
    if (val === undefined || val === null) return "";
    let str = toPureText(val).toUpperCase();
    str = str.replace(/\s+/g, '').trim();
    return str;
}

function cleanLossKeyVal(val) {
    if (val === undefined || val === null) return "";
    let str = toPureText(val).toUpperCase();
    str = str.replace(/\s+/g, '').trim();
    return str;
}

function formatPurchaseDateVal(dt) {
    if (dt === undefined || dt === null) return "";
    if (typeof dt === 'number' && dt > 20000 && dt < 80000) {
        const dObj = new Date(Math.round((dt - 25569) * 86400 * 1000));
        const pad = n => String(n).padStart(2, '0');
        return `${pad(dObj.getDate())}/${pad(dObj.getMonth() + 1)}/${dObj.getFullYear()}`;
    }
    if (dt instanceof Date && !isNaN(dt.getTime())) {
        const pad = n => String(n).padStart(2, '0');
        return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
    }
    return String(dt).trim();
}

function formatLossDateVal(dt) {
    return formatPurchaseDateVal(dt);
}

function getSafeSheetName(str) {
    if (!str) return "Sheet1";
    let safe = str.replace(/[\\/?*\[\]:]/g, '_').trim();
    if (safe.length > 31) safe = safe.substring(0, 31);
    return safe || "Sheet1";
}

/* ==========================================================================
   PURCHASE PRICE DISPUTE LOGIC (MYNTRA)
   ========================================================================== */
let mePurchaseDetailsFiles = [];
let mePurchaseDataFile = null;
let mePurchaseZipBlob = null;
let mePurchaseZipFilename = "";
let mePurchaseMergedBlob = null;
let mePurchaseMergedFilename = "";

function mePurchaseLog(message, type = 'info') {
    const consoleLog = document.getElementById('mePurchaseConsoleLog');
    if (!consoleLog) return;
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    line.innerText = `[${timestamp}] ${message}`;
    if (consoleLog.children.length > 300) {
        consoleLog.removeChild(consoleLog.firstChild);
    }
    consoleLog.appendChild(line);
    consoleLog.scrollTop = consoleLog.scrollHeight;
}

function checkMePurchaseInputs() {
    const btn = document.getElementById('mePurchaseBtn');
    if (mePurchaseDetailsFiles.length > 0 && mePurchaseDataFile) {
        if (btn) btn.removeAttribute('disabled');
    } else {
        if (btn) btn.setAttribute('disabled', 'true');
    }
}

function updateMePurchaseDetailsUI() {
    const countEl = document.getElementById('mePurchaseDetailsSelectedCount');
    const listEl = document.getElementById('mePurchaseDetailsUploadedFileList');
    if (countEl) countEl.innerText = mePurchaseDetailsFiles.length;
    if (!listEl) return;

    if (mePurchaseDetailsFiles.length > 0) {
        listEl.innerHTML = '';
        mePurchaseDetailsFiles.forEach((fileObj) => {
            const item = document.createElement('div');
            item.className = 'file-item';

            const info = document.createElement('div');
            info.className = 'file-info';

            const icon = document.createElement('i');
            icon.className = getFileIconClass(fileObj.name);

            const nameSpan = document.createElement('span');
            nameSpan.className = 'file-name';
            nameSpan.innerText = fileObj.name;

            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'file-size';
            sizeSpan.innerText = formatBytes(fileObj.size);

            info.appendChild(icon);
            info.appendChild(nameSpan);
            info.appendChild(sizeSpan);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'file-action-btn';
            removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                mePurchaseDetailsFiles = mePurchaseDetailsFiles.filter(f => f.id !== fileObj.id);
                mePurchaseLog(`Removed file: ${fileObj.name}`, 'info');
                updateMePurchaseDetailsUI();
                checkMePurchaseInputs();
            });

            item.appendChild(info);
            item.appendChild(removeBtn);
            listEl.appendChild(item);
        });
    } else {
        listEl.innerHTML = '<div class="empty-list-msg" style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 0.5rem;">No details files selected yet.</div>';
    }
    checkMePurchaseInputs();
}

function setupPurchaseError() {
    const purchaseDropzone = document.getElementById('mePurchaseDetailsDropzone');
    const purchaseInput = document.getElementById('mePurchaseDetailsFileInput');
    const purchaseClearBtn = document.getElementById('clearMePurchaseDetailsFilesBtn');
    const purchaseDataDropzone = document.getElementById('mePurchaseDataDropzone');
    const purchaseDataInput = document.getElementById('mePurchaseDataFileInput');
    const purchaseBtn = document.getElementById('mePurchaseBtn');
    const clearLogBtn = document.getElementById('clearMePurchaseLogBtn');

    if (purchaseDropzone && purchaseInput) {
        setupMultiDropzone(purchaseDropzone, purchaseInput, (files) => {
            let added = 0;
            files.forEach(file => {
                if (!mePurchaseDetailsFiles.some(f => f.name === file.name && f.size === file.size)) {
                    mePurchaseDetailsFiles.push({
                        id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                        name: file.name,
                        size: file.size,
                        file: file
                    });
                    added++;
                }
            });
            if (added > 0) {
                mePurchaseLog(`Added ${added} Purchase Details file(s). Total: ${mePurchaseDetailsFiles.length}`, 'success');
            }
            updateMePurchaseDetailsUI();
        });
    }

    if (purchaseClearBtn) {
        purchaseClearBtn.addEventListener('click', () => {
            mePurchaseDetailsFiles = [];
            if (purchaseInput) purchaseInput.value = '';
            updateMePurchaseDetailsUI();
            mePurchaseLog('Cleared all selected Purchase Details files.', 'info');
        });
    }

    if (purchaseDataDropzone && purchaseDataInput) {
        setupMiniDropzone(purchaseDataDropzone, purchaseDataInput, (file) => {
            mePurchaseDataFile = file;
            const display = document.getElementById('mePurchaseDataFileDisplay');
            if (display) {
                display.innerText = file.name;
                display.title = file.name;
            }
            purchaseDataDropzone.classList.add('file-selected');
            mePurchaseLog(`Selected Myntra Data File: ${file.name} (${formatBytes(file.size)})`, 'info');
            checkMePurchaseInputs();
        });
    }

    if (clearLogBtn) {
        clearLogBtn.addEventListener('click', () => {
            const consoleLog = document.getElementById('mePurchaseConsoleLog');
            if (consoleLog) {
                consoleLog.innerHTML = '';
                mePurchaseLog('Log cleared.', 'info');
            }
        });
    }

    if (purchaseBtn) {
        purchaseBtn.addEventListener('click', runPurchaseErrorProcess);
    }
}

function formatPurchaseWorksheet(ws) {
    if (!ws || !ws['!ref']) return;
    const range = XLSX.utils.decode_range(ws['!ref']);
    const cols = [];

    for (let C = range.s.c; C <= range.e.c; ++C) {
        cols.push({ wch: 10 });
    }

    for (let R = range.s.r; R <= range.e.r; ++R) {
        if (R === 0 && ws['!merges'] && ws['!merges'].length > 0) {
            continue; // Skip title row for col width calc
        }
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = { c: C, r: R };
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            const cell = ws[cell_ref];
            if (cell && cell.v !== undefined && cell.v !== null) {
                const len = String(cell.v).length;
                if (len > cols[C].wch) cols[C].wch = len;
            }
        }
    }

    cols.forEach((col, idx) => {
        if (idx === 14) {
            col.wch = Math.min(Math.max(col.wch + 4, 15), 30); // Order date (Col O)
        } else if (idx === 4) {
            col.wch = Math.min(Math.max(col.wch + 3, 16), 35); // Item Asin
        } else {
            col.wch = Math.min(Math.max(col.wch + 3, 10), 45);
        }
    });
    ws['!cols'] = cols;

    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = { c: C, r: R };
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            if (!ws[cell_ref]) {
                ws[cell_ref] = { t: 's', v: '' };
            }
            const cell = ws[cell_ref];
            const isTitle = (R === 0);
            const isHeader = (R === 1);
            const isData = (R >= 2);

            cell.s = {
                border: {
                    top: { style: 'thin', color: { rgb: 'E5E7EB' } },
                    bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
                    left: { style: 'thin', color: { rgb: 'E5E7EB' } },
                    right: { style: 'thin', color: { rgb: 'E5E7EB' } }
                }
            };

            if (isTitle) {
                cell.s.font = { name: 'Segoe UI', sz: 12, bold: true, color: { rgb: 'FFFFFF' } };
                cell.s.fill = { fgColor: { rgb: '7B2CBF' } }; // Purple banner
                cell.s.alignment = { horizontal: 'center', vertical: 'center' };
            } else if (isHeader) {
                cell.s.font = { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '1E293B' } };
                if (C === 14) {
                    cell.s.fill = { fgColor: { rgb: 'DCFCE7' } }; // Light Green for Order Date
                    cell.s.font = { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '15803D' } };
                } else if (C === 4) {
                    cell.s.fill = { fgColor: { rgb: 'EDE9FE' } }; // Soft purple for Item Asin
                    cell.s.font = { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '6D28D9' } };
                } else {
                    cell.s.fill = { fgColor: { rgb: 'F1F5F9' } }; // Slate Header
                }
                cell.s.alignment = { horizontal: 'center', vertical: 'center' };
            } else if (isData) {
                cell.s.font = { name: 'Segoe UI', sz: 9, color: { rgb: '334155' } };

                // Column E (index 4 - Item Asin): Pure Text
                if (C === 4) {
                    const cleanAsin = toPureText(cell.v);
                    cell.v = cleanAsin;
                    cell.t = 's';
                    cell.z = '@';
                    cell.s.alignment = { horizontal: 'left', vertical: 'center' };
                    cell.s.font = { name: 'Segoe UI', sz: 9, color: { rgb: '1E293B' } };
                }
                // Column D (Order ID), Column B (Invoice No), Column A
                else if (C === 3 || C === 1 || C === 0) {
                    const cleanText = toPureText(cell.v);
                    cell.v = cleanText;
                    cell.t = 's';
                    cell.z = '@';
                    cell.s.alignment = { horizontal: 'left', vertical: 'center' };
                }
                // Column O (index 14 - Order date)
                else if (C === 14) {
                    cell.t = 's';
                    cell.z = '@';
                    cell.s.alignment = { horizontal: 'center', vertical: 'center' };
                    cell.s.font = { name: 'Segoe UI', sz: 9, bold: true, color: { rgb: '15803D' } };
                }
                // Numerical amount / quantity columns
                else {
                    const val = cell.v;
                    if (val !== undefined && val !== null && !isNaN(Number(val)) && String(val).trim() !== "") {
                        cell.s.alignment = { horizontal: 'right', vertical: 'center' };
                    } else {
                        cell.s.alignment = { horizontal: 'left', vertical: 'center' };
                    }
                }
            }
        }
    }
}

function renderMePurchaseDashboard(filesList, mergedBlob, zipFilename, mergedFilename, stats) {
    const container = document.getElementById('mePurchaseOutputContainer');
    if (!container) return;
    container.innerHTML = '';
    container.className = 'processed-container';

    // 1. Stats Cards
    const statsRow = document.createElement('div');
    statsRow.className = 'stats-card-grid';
    statsRow.style.display = 'grid';
    statsRow.style.gridTemplateColumns = 'repeat(auto-fit, minmax(130px, 1fr))';
    statsRow.style.gap = '0.75rem';
    statsRow.style.marginBottom = '1.25rem';

    statsRow.innerHTML = `
        <div style="background: white; border: 1px solid var(--border-color); border-radius: 10px; padding: 0.85rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Total Files</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #7b2cbf; margin-top: 0.2rem;">${stats.totalFiles}</div>
        </div>
        <div style="background: white; border: 1px solid var(--border-color); border-radius: 10px; padding: 0.85rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Total Rows</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #1e293b; margin-top: 0.2rem;">${stats.totalRows}</div>
        </div>
        <div style="background: white; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 10px; padding: 0.85rem; background: rgba(240, 253, 244, 0.6); box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="font-size: 0.72rem; color: #15803d; font-weight: 600; text-transform: uppercase;">Dates Matched</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #15803d; margin-top: 0.2rem;">${stats.totalMatched}</div>
        </div>
        <div style="background: white; border: 1px solid ${stats.totalUnmatched > 0 ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-color)'}; border-radius: 10px; padding: 0.85rem; background: ${stats.totalUnmatched > 0 ? 'rgba(254, 243, 199, 0.5)' : 'white'}; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="font-size: 0.72rem; color: ${stats.totalUnmatched > 0 ? '#b45309' : 'var(--text-muted)'}; font-weight: 600; text-transform: uppercase;">Unmatched</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: ${stats.totalUnmatched > 0 ? '#b45309' : '#64748b'}; margin-top: 0.2rem;">${stats.totalUnmatched}</div>
        </div>
    `;
    container.appendChild(statsRow);

    // 2. Action Download Bar
    const actionsBar = document.createElement('div');
    actionsBar.style.display = 'flex';
    actionsBar.style.flexWrap = 'wrap';
    actionsBar.style.gap = '0.75rem';
    actionsBar.style.marginBottom = '1.25rem';

    actionsBar.innerHTML = `
        <button type="button" class="btn btn-primary" id="mePurchaseDownloadZipBtn" style="flex: 1; min-width: 200px; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.65rem 1.2rem; font-weight: 700; border-radius: 8px; background: linear-gradient(135deg, #7b2cbf, #560bad); cursor: pointer; color: white; border: none;">
            <i class="fa-solid fa-file-zipper"></i> Download ZIP Package
        </button>
        <button type="button" class="btn btn-success" id="mePurchaseDownloadMergedBtn" style="flex: 1; min-width: 200px; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.65rem 1.2rem; font-weight: 700; border-radius: 8px; background: linear-gradient(135deg, #059669, #10b981); cursor: pointer; color: white; border: none;">
            <i class="fa-solid fa-file-excel"></i> Download Merged Excel (${filesList.length} Sheets)
        </button>
    `;
    container.appendChild(actionsBar);

    // Bind Download Buttons
    const dlZipBtn = actionsBar.querySelector('#mePurchaseDownloadZipBtn');
    if (dlZipBtn) {
        dlZipBtn.addEventListener('click', () => {
            if (mePurchaseZipBlob) {
                triggerDownload(mePurchaseZipBlob, zipFilename);
                mePurchaseLog(`Downloaded complete ZIP package: ${zipFilename}`, 'info');
            }
        });
    }

    const dlMergedBtn = actionsBar.querySelector('#mePurchaseDownloadMergedBtn');
    if (dlMergedBtn) {
        dlMergedBtn.addEventListener('click', () => {
            if (mergedBlob) {
                triggerDownload(mergedBlob, mergedFilename);
                mePurchaseLog(`Downloaded Merged Excel file: ${mergedFilename}`, 'info');
            }
        });
    }

    // 3. Processed Files Table Card
    const tableCard = document.createElement('div');
    tableCard.style.background = 'white';
    tableCard.style.border = '1px solid var(--border-color)';
    tableCard.style.borderRadius = '12px';
    tableCard.style.overflow = 'hidden';
    tableCard.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';

    const tableHeader = document.createElement('div');
    tableHeader.style.padding = '0.75rem 1rem';
    tableHeader.style.borderBottom = '1px solid var(--border-color)';
    tableHeader.style.background = '#f8fafc';
    tableHeader.style.display = 'flex';
    tableHeader.style.justifyContent = 'space-between';
    tableHeader.style.alignItems = 'center';
    tableHeader.innerHTML = `
        <span style="font-size: 0.85rem; font-weight: 700; color: #1e293b;"><i class="fa-solid fa-table-list text-purple"></i> Processed Purchase Details Files (${filesList.length})</span>
        <span style="font-size: 0.75rem; color: var(--text-muted);">Column O (Order date) successfully updated</span>
    `;
    tableCard.appendChild(tableHeader);

    const tableWrap = document.createElement('div');
    tableWrap.style.overflowX = 'auto';
    tableWrap.style.overflowY = 'auto';
    tableWrap.style.maxHeight = '280px';
    tableWrap.style.webkitOverflowScrolling = 'touch';

    const table = document.createElement('table');
    table.className = 'preview-table';
    table.style.width = '100%';
    table.style.minWidth = '720px';
    table.style.fontSize = '0.82rem';

    table.innerHTML = `
        <thead style="position: sticky; top: 0; z-index: 2; background: #f8fafc;">
            <tr>
                <th style="width: 40px; text-align: center; background: #f8fafc;">#</th>
                <th style="background: #f8fafc;">Details File Name</th>
                <th style="background: #f8fafc;">Sheet Name</th>
                <th style="text-align: center; background: #f8fafc;">Total Rows</th>
                <th style="text-align: center; background: #f8fafc;">Matched Dates</th>
                <th style="text-align: center; background: #f8fafc;">Unmatched</th>
                <th style="text-align: center; background: #f8fafc;">Status</th>
                <th style="text-align: center; width: 140px; background: #f8fafc;">Actions</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    filesList.forEach((file, idx) => {
        const tr = document.createElement('tr');
        const matchRate = file.totalRows > 0 ? Math.round((file.matched / file.totalRows) * 100) : 0;
        const isFullMatch = file.unmatched === 0;

        tr.innerHTML = `
            <td style="text-align: center; font-weight: 700; color: var(--text-muted);">${idx + 1}</td>
            <td style="font-weight: 600; color: var(--text-primary);">
                <i class="fa-solid fa-file-excel text-purple" style="margin-right: 0.35rem;"></i>
                ${file.name}
            </td>
            <td style="color: #64748b; font-family: monospace; font-size: 0.78rem;">[${file.sheetName}]</td>
            <td style="text-align: center; font-weight: 700;">${file.totalRows}</td>
            <td style="text-align: center; font-weight: 700; color: #15803d;">${file.matched}</td>
            <td style="text-align: center; font-weight: 700; color: ${file.unmatched > 0 ? '#b45309' : '#64748b'};">${file.unmatched}</td>
            <td style="text-align: center;">
                <span style="font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 6px; background: ${isFullMatch ? '#dcfce7' : '#fef3c7'}; color: ${isFullMatch ? '#15803d' : '#b45309'}; border: 1px solid ${isFullMatch ? '#86efac' : '#fde68a'};">
                    ${matchRate}% Matched
                </span>
            </td>
            <td style="text-align: center;">
                <div style="display: inline-flex; gap: 0.35rem;">
                    <button type="button" class="btn btn-download-single" title="Download this updated file" style="padding: 0.3rem 0.6rem; font-size: 0.75rem; border-radius: 6px; background: #ede9fe; color: #6d28d9; border: 1px solid #d8b4fe; cursor: pointer;">
                        <i class="fa-solid fa-download"></i>
                    </button>
                    <button type="button" class="btn btn-preview-single" title="Preview Excel data" style="padding: 0.3rem 0.6rem; font-size: 0.75rem; border-radius: 6px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; cursor: pointer;">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
            </td>
        `;

        const dlBtn = tr.querySelector('.btn-download-single');
        if (dlBtn) {
            dlBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                triggerDownload(file.blob, file.name);
                mePurchaseLog(`Downloaded individual file: ${file.name}`, 'info');
            });
        }

        const prevBtn = tr.querySelector('.btn-preview-single');
        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openRenFileInspector({
                    name: file.name,
                    fileObj: file.blob,
                    parsedAOA: file.aoa
                });
            });
        }

        tbody.appendChild(tr);
    });

    tableWrap.appendChild(table);
    tableCard.appendChild(tableWrap);
    container.appendChild(tableCard);
}

async function runPurchaseErrorProcess() {
    if (mePurchaseDetailsFiles.length === 0 || !mePurchaseDataFile) return;

    const btn = document.getElementById('mePurchaseBtn');
    const progressCard = document.getElementById('mePurchaseProgressCard');
    const progressBar = document.getElementById('mePurchaseProgressBar');
    const progressPercent = document.getElementById('mePurchaseProgressPercent');
    const progressStepText = document.getElementById('mePurchaseProgressStepText');
    const container = document.getElementById('mePurchaseOutputContainer');

    if (btn) btn.setAttribute('disabled', 'true');
    if (progressCard) progressCard.classList.remove('hidden');
    if (progressBar) progressBar.style.width = '5%';
    if (progressPercent) progressPercent.innerText = '5%';
    if (progressStepText) progressStepText.innerText = 'Reading Myntra Data file...';

    if (container) {
        container.innerHTML = `
            <div class="empty-output-state">
                <i class="fa-solid fa-spinner fa-spin placeholder-icon" style="color: #7b2cbf;"></i>
                <p>Processing Purchase Details and matching with Myntra Data file...</p>
            </div>
        `;
    }

    try {
        mePurchaseLog('Starting Purchase Price Dispute Process...', 'process');
        mePurchaseLog(`Selected Details Files: ${mePurchaseDetailsFiles.length}`, 'info');
        mePurchaseLog(`Selected Myntra Data File: ${mePurchaseDataFile.name}`, 'info');

        // Step 1: Read and Index the Myntra Data File (Col E -> Col C)
        if (progressBar) progressBar.style.width = '12%';
        if (progressPercent) progressPercent.innerText = '12%';
        if (progressStepText) progressStepText.innerText = 'Parsing Myntra Data spreadsheet...';

        const dataBuffer = await readFileAsArrayBuffer(mePurchaseDataFile);
        const dataWb = XLSX.read(dataBuffer, { type: 'array', cellDates: true });
        
        let dataSheetName = dataWb.SheetNames[0];
        for (const sName of dataWb.SheetNames) {
            const low = sName.toLowerCase();
            if (low.includes('data') || low.includes('myntra')) {
                dataSheetName = sName;
                break;
            }
        }

        const dataWs = dataWb.Sheets[dataSheetName];
        const dataAoa = XLSX.utils.sheet_to_json(dataWs, { header: 1, defval: "" });
        mePurchaseLog(`Loaded Myntra Data sheet [${dataSheetName}] with ${dataAoa.length} rows.`, 'info');

        if (dataAoa.length < 2) {
            throw new Error(`Myntra Data sheet [${dataSheetName}] is empty or has no data rows.`);
        }

        // Locate Data header row (default row 2 / index 1 or row 1 / index 0)
        let dataHeaderRowIndex = -1;
        for (let i = 0; i < Math.min(dataAoa.length, 10); i++) {
            const row = dataAoa[i];
            if (row && row.some(cell => {
                const str = String(cell || "").trim().toLowerCase();
                return str.includes("seller invoice") || str.includes("seller order") || str.includes("customer order") || str.includes("order date") || str.includes("invoice");
            })) {
                dataHeaderRowIndex = i;
                break;
            }
        }
        if (dataHeaderRowIndex === -1) {
            dataHeaderRowIndex = 1; // Default row 2 (index 1)
        }

        const dataHeaderRow = dataAoa[dataHeaderRowIndex] || [];
        let invoiceColE = 4; // Column E (index 4) default
        let dateColC = 2;    // Column C (index 2) default

        for (let c = 0; c < dataHeaderRow.length; c++) {
            const val = String(dataHeaderRow[c] || "").trim().toLowerCase().replace(/[\._\-\s]+/g, " ");
            if ((val === "seller order no" || val === "seller invoice no" || val.includes("seller invoice") || val.includes("seller order") || val.includes("invoice no")) && !val.includes("date")) {
                invoiceColE = c;
            } else if ((val === "cust order date" || val === "order date" || val.includes("order date") || val.includes("cust order")) && !val.includes("invoice")) {
                dateColC = c;
            }
        }

        mePurchaseLog(`Myntra Data Columns: Invoice Col = Index ${invoiceColE} (Col E), Date Col = Index ${dateColC} (Col C)`, 'info');

        // Build Key -> Date Map from Myntra Data File
        const myntraDataMap = new Map();
        for (let r = dataHeaderRowIndex + 1; r < dataAoa.length; r++) {
            const row = dataAoa[r];
            if (!row || row.length === 0) continue;
            const invVal = row[invoiceColE];
            const dateVal = row[dateColC];

            const formattedDate = formatPurchaseDateVal(dateVal);
            const cleanInv = cleanPurchaseKeyVal(invVal);

            if (cleanInv && formattedDate && !myntraDataMap.has(cleanInv)) {
                myntraDataMap.set(cleanInv, formattedDate);
            }
        }

        mePurchaseLog(`Indexed ${myntraDataMap.size} records from Myntra Data file.`, 'success');

        // Step 2: Process Each Purchase Details File
        const zip = new JSZip();
        const mergedWb = XLSX.utils.book_new();
        const processedFilesList = [];
        let overallTotalRows = 0;
        let overallMatchedCount = 0;
        let overallUnmatchedCount = 0;

        const totalFiles = mePurchaseDetailsFiles.length;

        for (let fileIdx = 0; fileIdx < totalFiles; fileIdx++) {
            const fileObj = mePurchaseDetailsFiles[fileIdx];
            const progressPercentVal = 20 + Math.round((fileIdx / totalFiles) * 60);
            if (progressBar) progressBar.style.width = `${progressPercentVal}%`;
            if (progressPercent) progressPercent.innerText = `${progressPercentVal}%`;
            if (progressStepText) progressStepText.innerText = `Processing file ${fileIdx + 1} of ${totalFiles}: ${fileObj.name}...`;

            mePurchaseLog(`Processing Purchase File [${fileIdx + 1}/${totalFiles}]: ${fileObj.name}...`, 'info');

            const detailsBuffer = await readFileAsArrayBuffer(fileObj.file);
            const detailsWb = XLSX.read(detailsBuffer, { type: 'array', cellDates: true });
            const detailsSheetName = detailsWb.SheetNames[0];
            const detailsWs = detailsWb.Sheets[detailsSheetName];
            const detailsAoa = XLSX.utils.sheet_to_json(detailsWs, { header: 1, defval: "", raw: false });

            if (detailsAoa.length < 2) {
                mePurchaseLog(`Skipped [${fileObj.name}]: Sheet has no data rows.`, 'warning');
                continue;
            }

            // Locate Details Header Row
            let detailsHeaderRowIndex = -1;
            for (let i = 0; i < Math.min(detailsAoa.length, 5); i++) {
                const row = detailsAoa[i];
                if (row && row.some(cell => {
                    const str = String(cell || "").trim().toLowerCase();
                    return str.includes("sale invoice") || str.includes("invoice no") || str.includes("order id");
                })) {
                    detailsHeaderRowIndex = i;
                    break;
                }
            }
            if (detailsHeaderRowIndex === -1) {
                detailsHeaderRowIndex = 1; // Default row 2 (index 1)
            }

            const detailsHeaderRow = detailsAoa[detailsHeaderRowIndex] || [];
            let invoiceColB = 1; // Column B (index 1) default

            for (let c = 0; c < detailsHeaderRow.length; c++) {
                const val = String(detailsHeaderRow[c] || "").trim().toLowerCase().replace(/[\._\-\s]+/g, " ");
                if ((val === "sale invoice no" || val === "invoice no" || val.includes("invoice no") || val.includes("sale invoice")) && !val.includes("date")) {
                    invoiceColB = c;
                }
            }

            // Ensure Column O (index 14) in header row is "Order date"
            while (detailsHeaderRow.length < 15) {
                detailsHeaderRow.push("");
            }
            detailsHeaderRow[14] = "Order date";

            const updatedFileAoa = [];
            // Preserve title row(s) before header row
            for (let r = 0; r < detailsHeaderRowIndex; r++) {
                const titleRow = [...(detailsAoa[r] || [])];
                while (titleRow.length < 15) titleRow.push("");
                updatedFileAoa.push(titleRow);
            }
            updatedFileAoa.push(detailsHeaderRow);

            let fileTotalRows = 0;
            let fileMatchedCount = 0;
            let fileUnmatchedCount = 0;

            for (let r = detailsHeaderRowIndex + 1; r < detailsAoa.length; r++) {
                const rawRow = detailsAoa[r];
                if (!rawRow || rawRow.every(c => String(c || "").trim() === "")) continue;

                const row = [...rawRow];
                while (row.length < 15) row.push("");

                // Pure text conversions for Item Asin (Col E / index 4), Order ID (Col D / index 3), Invoice No (Col B / index 1)
                if (row[4] !== undefined && row[4] !== null) row[4] = toPureText(row[4]);
                if (row[3] !== undefined && row[3] !== null) row[3] = toPureText(row[3]);
                if (row[1] !== undefined && row[1] !== null) row[1] = toPureText(row[1]);

                // Rule: Take Invoice No from Column B (index 1), find in Myntra Data map (Col E), write to Column O (index 14)
                const invoiceNoVal = row[invoiceColB];
                const cleanInv = cleanPurchaseKeyVal(invoiceNoVal);

                let matchedDate = myntraDataMap.get(cleanInv);

                if (matchedDate) {
                    row[14] = matchedDate; // Write into Column O (index 14)
                    fileMatchedCount++;
                } else {
                    row[14] = "";
                    fileUnmatchedCount++;
                }
                fileTotalRows++;
                updatedFileAoa.push(row);
            }

            overallTotalRows += fileTotalRows;
            overallMatchedCount += fileMatchedCount;
            overallUnmatchedCount += fileUnmatchedCount;

            // Convert to Worksheet and apply formatting
            const fileWs = XLSX.utils.aoa_to_sheet(updatedFileAoa);
            if (detailsHeaderRowIndex > 0) {
                fileWs['!merges'] = [
                    { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } }
                ];
            }
            formatPurchaseWorksheet(fileWs);

            const cleanSheetName = getSafeSheetName(fileObj.name.replace(/\.[^/.]+$/, ""));

            // Save single file workbook
            const singleWb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(singleWb, fileWs, cleanSheetName);
            const singleBuffer = XLSX.write(singleWb, { bookType: 'xlsx', type: 'array' });
            const singleBlob = new Blob([singleBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            // Add to ZIP and Merged Workbook
            zip.file(fileObj.name, singleBuffer);
            
            let mergedSheetName = cleanSheetName;
            let dupIndex = 1;
            while (mergedWb.SheetNames.includes(mergedSheetName)) {
                mergedSheetName = getSafeSheetName(`${cleanSheetName}_${dupIndex++}`);
            }
            XLSX.utils.book_append_sheet(mergedWb, fileWs, mergedSheetName);

            processedFilesList.push({
                name: fileObj.name,
                sheetName: mergedSheetName,
                blob: singleBlob,
                totalRows: fileTotalRows,
                matched: fileMatchedCount,
                unmatched: fileUnmatchedCount,
                aoa: updatedFileAoa
            });

            // Register into Error Dispute Tracker
            const partyOrWhName = fileObj.name.replace(/\.[^/.]+$/, "").replace(/price dispute/gi, "").replace(/[-_]+/g, " ").trim() || fileObj.name;
            registerTrackedError('purchase', fileObj.name, partyOrWhName, 'Purchase Price Dispute', fileTotalRows);

            mePurchaseLog(`[${fileObj.name}] Done: ${fileTotalRows} rows (${fileMatchedCount} dates matched, ${fileUnmatchedCount} unmatched)`, fileMatchedCount > 0 ? 'success' : 'warning');
        }

        if (processedFilesList.length === 0) {
            throw new Error('No Purchase Details files could be processed.');
        }

        // Step 3: Finalize Merged Excel & ZIP Bundle
        if (progressBar) progressBar.style.width = '85%';
        if (progressPercent) progressPercent.innerText = '85%';
        if (progressStepText) progressStepText.innerText = 'Finalizing Merged Excel and ZIP package...';

        const timestampStr = new Date().toISOString().slice(0, 10).replace(/[-:]/g, '_');
        mePurchaseMergedFilename = `Merged_Purchase_Disputes_${timestampStr}.xlsx`;
        mePurchaseZipFilename = `myntra_purchase_dispute_bundle_${timestampStr}.zip`;

        const mergedBuffer = XLSX.write(mergedWb, { bookType: 'xlsx', type: 'array' });
        mePurchaseMergedBlob = new Blob([mergedBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        zip.file(mePurchaseMergedFilename, mergedBuffer);

        mePurchaseZipBlob = await zip.generateAsync({ type: 'blob' });

        if (progressBar) progressBar.style.width = '100%';
        if (progressPercent) progressPercent.innerText = '100% Completed';
        if (progressStepText) progressStepText.innerText = 'All purchase files processed successfully!';

        mePurchaseLog(`Successfully completed! ${processedFilesList.length} files processed. Total: ${overallTotalRows} rows (${overallMatchedCount} dates matched).`, 'success');
        mePurchaseLog(`Merged Excel created: "${mePurchaseMergedFilename}" (${formatBytes(mePurchaseMergedBlob.size)})`, 'success');
        mePurchaseLog(`ZIP Package created: "${mePurchaseZipFilename}" (${formatBytes(mePurchaseZipBlob.size)})`, 'success');

        // Step 4: Render Results Dashboard
        renderMePurchaseDashboard(
            processedFilesList,
            mePurchaseMergedBlob,
            mePurchaseZipFilename,
            mePurchaseMergedFilename,
            {
                totalFiles: processedFilesList.length,
                totalRows: overallTotalRows,
                totalMatched: overallMatchedCount,
                totalUnmatched: overallUnmatchedCount
            }
        );

        showToast(`Purchase Error Process Completed! ${overallMatchedCount} of ${overallTotalRows} records matched.`, 'success');

    } catch (err) {
        console.error('Purchase process error:', err);
        mePurchaseLog(`Purchase process failed: ${err.message}`, 'error');
        showToast(`Purchase process error: ${err.message}`, 'error');
        if (container) {
            container.innerHTML = `
                <div class="empty-output-state">
                    <i class="fa-solid fa-circle-exclamation placeholder-icon" style="color: #ef4444;"></i>
                    <p style="color: #ef4444; font-weight: 600;">Error: ${err.message}</p>
                </div>
            `;
        }
    } finally {
        if (btn) btn.removeAttribute('disabled');
    }
}

/* ==========================================================================
   LOSS REPORT / LOSS ERROR LOGIC (MYNTRA)
   ========================================================================== */
let leDetailsFiles = [];
let leDataFile = null;
let leZipBlob = null;
let leZipFilename = "";
let leMergedBlob = null;
let leMergedFilename = "";

function leLog(message, type = 'info') {
    const consoleLog = document.getElementById('leConsoleLog');
    if (!consoleLog) return;
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    line.innerText = `[${timestamp}] ${message}`;
    if (consoleLog.children.length > 300) {
        consoleLog.removeChild(consoleLog.firstChild);
    }
    consoleLog.appendChild(line);
    consoleLog.scrollTop = consoleLog.scrollHeight;
}

function checkLeInputs() {
    const btn = document.getElementById('leBtn');
    if (leDetailsFiles.length > 0 && leDataFile) {
        if (btn) btn.removeAttribute('disabled');
    } else {
        if (btn) btn.setAttribute('disabled', 'true');
    }
}

function updateLeDetailsUI() {
    const countEl = document.getElementById('leDetailsSelectedCount');
    const listEl = document.getElementById('leDetailsUploadedFileList');
    if (countEl) countEl.innerText = leDetailsFiles.length;
    if (!listEl) return;

    if (leDetailsFiles.length > 0) {
        listEl.innerHTML = '';
        leDetailsFiles.forEach((fileObj) => {
            const item = document.createElement('div');
            item.className = 'file-item';

            const info = document.createElement('div');
            info.className = 'file-info';

            const icon = document.createElement('i');
            icon.className = getFileIconClass(fileObj.name);

            const nameSpan = document.createElement('span');
            nameSpan.className = 'file-name';
            nameSpan.innerText = fileObj.name;

            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'file-size';
            sizeSpan.innerText = formatBytes(fileObj.size);

            info.appendChild(icon);
            info.appendChild(nameSpan);
            info.appendChild(sizeSpan);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'file-action-btn';
            removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                leDetailsFiles = leDetailsFiles.filter(f => f.id !== fileObj.id);
                leLog(`Removed file: ${fileObj.name}`, 'info');
                updateLeDetailsUI();
                checkLeInputs();
            });

            item.appendChild(info);
            item.appendChild(removeBtn);
            listEl.appendChild(item);
        });
    } else {
        listEl.innerHTML = '<div class="empty-list-msg" style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 0.5rem;">No loss files selected yet.</div>';
    }
    checkLeInputs();
}

function setupLossError() {
    const detailsDropzone = document.getElementById('leDetailsDropzone');
    const detailsInput = document.getElementById('leDetailsFileInput');
    const clearBtn = document.getElementById('clearLeDetailsFilesBtn');
    const dataDropzone = document.getElementById('leDataDropzone');
    const dataInput = document.getElementById('leDataFileInput');
    const btn = document.getElementById('leBtn');
    const clearLogBtn = document.getElementById('clearLeLogBtn');

    if (detailsDropzone && detailsInput) {
        setupMultiDropzone(detailsDropzone, detailsInput, (files) => {
            let added = 0;
            files.forEach(file => {
                if (!leDetailsFiles.some(f => f.name === file.name && f.size === file.size)) {
                    leDetailsFiles.push({
                        id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                        name: file.name,
                        size: file.size,
                        file: file
                    });
                    added++;
                }
            });
            if (added > 0) {
                leLog(`Added ${added} Loss Details file(s). Total: ${leDetailsFiles.length}`, 'success');
            }
            updateLeDetailsUI();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            leDetailsFiles = [];
            if (detailsInput) detailsInput.value = '';
            updateLeDetailsUI();
            leLog('Cleared all selected Loss Details files.', 'info');
        });
    }

    if (dataDropzone && dataInput) {
        setupMiniDropzone(dataDropzone, dataInput, (file) => {
            leDataFile = file;
            const display = document.getElementById('leDataFileDisplay');
            if (display) {
                display.innerText = file.name;
                display.title = file.name;
            }
            dataDropzone.classList.add('file-selected');
            leLog(`Selected Myntra Data File: ${file.name} (${formatBytes(file.size)})`, 'info');
            checkLeInputs();
        });
    }

    if (clearLogBtn) {
        clearLogBtn.addEventListener('click', () => {
            const consoleLog = document.getElementById('leConsoleLog');
            if (consoleLog) {
                consoleLog.innerHTML = '';
                leLog('Log cleared.', 'info');
            }
        });
    }

    if (btn) {
        btn.addEventListener('click', runLossErrorProcess);
    }
}

function formatLossWorksheet(ws) {
    if (!ws || !ws['!ref']) return;
    const range = XLSX.utils.decode_range(ws['!ref']);
    const cols = [];

    for (let C = range.s.c; C <= range.e.c; ++C) {
        cols.push({ wch: 12 });
    }

    for (let R = range.s.r; R <= range.e.r; ++R) {
        if (R === 0 && ws['!merges'] && ws['!merges'].length > 0) {
            continue; // Skip title banner row for col width calc
        }
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = { c: C, r: R };
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            const cell = ws[cell_ref];
            if (cell && cell.v !== undefined && cell.v !== null) {
                const len = String(cell.v).length;
                if (len > cols[C].wch) cols[C].wch = len;
            }
        }
    }

    cols.forEach((col, idx) => {
        if (idx === 5) {
            col.wch = Math.min(Math.max(col.wch + 4, 15), 25); // Order date (Col F)
        } else if (idx === 1) {
            col.wch = Math.min(Math.max(col.wch + 3, 16), 30); // Order ID (Col B)
        } else if (idx === 6 || idx === 0) {
            col.wch = Math.min(Math.max(col.wch + 3, 16), 30); // Invoice IDs
        } else {
            col.wch = Math.min(Math.max(col.wch + 3, 12), 35);
        }
    });
    ws['!cols'] = cols;

    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = { c: C, r: R };
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            if (!ws[cell_ref]) {
                ws[cell_ref] = { t: 's', v: '' };
            }
            const cell = ws[cell_ref];
            const isTitle = (R === 0);
            const isHeader = (R === 1);
            const isData = (R >= 2);

            cell.s = {
                border: {
                    top: { style: 'thin', color: { rgb: 'E5E7EB' } },
                    bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
                    left: { style: 'thin', color: { rgb: 'E5E7EB' } },
                    right: { style: 'thin', color: { rgb: 'E5E7EB' } }
                }
            };

            if (isTitle) {
                cell.s.font = { name: 'Segoe UI', sz: 12, bold: true, color: { rgb: 'FFFFFF' } };
                cell.s.fill = { fgColor: { rgb: 'E11D48' } }; // Rose banner
                cell.s.alignment = { horizontal: 'center', vertical: 'center' };
            } else if (isHeader) {
                cell.s.font = { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '1E293B' } };
                if (C === 5) {
                    cell.s.fill = { fgColor: { rgb: 'DCFCE7' } }; // Light Green for Order Date (Col F)
                    cell.s.font = { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '15803D' } };
                } else {
                    cell.s.fill = { fgColor: { rgb: 'F1F5F9' } };
                }
                cell.s.alignment = { horizontal: (C === 1 || C === 5) ? 'center' : 'left', vertical: 'center' };
            } else if (isData) {
                cell.s.font = { name: 'Segoe UI', sz: 9.5, color: { rgb: '334155' } };
                
                // Col B: Order ID (Pure text formatting)
                if (C === 1) {
                    cell.t = 's';
                    cell.z = '@';
                    cell.v = toPureText(cell.v);
                    cell.s.alignment = { horizontal: 'center', vertical: 'center' };
                }
                // Col F: Order date
                else if (C === 5) {
                    cell.t = 's';
                    cell.z = '@';
                    cell.s.alignment = { horizontal: 'center', vertical: 'center' };
                    if (cell.v && String(cell.v).trim() !== '') {
                        cell.s.font = { name: 'Segoe UI', sz: 9.5, bold: true, color: { rgb: '15803D' } };
                    }
                }
                // Numerical amount columns (C, D, E)
                else if (C === 2 || C === 3 || C === 4) {
                    cell.s.alignment = { horizontal: 'right', vertical: 'center' };
                }
                // Invoice IDs
                else {
                    cell.s.alignment = { horizontal: 'left', vertical: 'center' };
                }
            }
        }
    }
}

function renderLeDashboard(filesList, mergedBlob, zipFilename, mergedFilename, stats) {
    const container = document.getElementById('leOutputContainer');
    if (!container) return;
    container.innerHTML = '';
    container.className = 'processed-container';

    // 1. Stats Cards
    const statsRow = document.createElement('div');
    statsRow.className = 'stats-card-grid';
    statsRow.style.display = 'grid';
    statsRow.style.gridTemplateColumns = 'repeat(auto-fit, minmax(130px, 1fr))';
    statsRow.style.gap = '0.75rem';
    statsRow.style.marginBottom = '1.25rem';

    statsRow.innerHTML = `
        <div style="background: white; border: 1px solid var(--border-color); border-radius: 10px; padding: 0.85rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Total Files</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #e11d48; margin-top: 0.2rem;">${stats.totalFiles}</div>
        </div>
        <div style="background: white; border: 1px solid var(--border-color); border-radius: 10px; padding: 0.85rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Total Rows</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #1e293b; margin-top: 0.2rem;">${stats.totalRows}</div>
        </div>
        <div style="background: white; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 10px; padding: 0.85rem; background: rgba(240, 253, 244, 0.6); box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="font-size: 0.72rem; color: #15803d; font-weight: 600; text-transform: uppercase;">Dates Matched</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #15803d; margin-top: 0.2rem;">${stats.totalMatched}</div>
        </div>
        <div style="background: white; border: 1px solid ${stats.totalUnmatched > 0 ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-color)'}; border-radius: 10px; padding: 0.85rem; background: ${stats.totalUnmatched > 0 ? 'rgba(254, 243, 199, 0.5)' : 'white'}; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="font-size: 0.72rem; color: ${stats.totalUnmatched > 0 ? '#b45309' : 'var(--text-muted)'}; font-weight: 600; text-transform: uppercase;">Unmatched</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: ${stats.totalUnmatched > 0 ? '#b45309' : '#64748b'}; margin-top: 0.2rem;">${stats.totalUnmatched}</div>
        </div>
    `;
    container.appendChild(statsRow);

    // 2. Action Download Bar
    const actionsBar = document.createElement('div');
    actionsBar.style.display = 'flex';
    actionsBar.style.flexWrap = 'wrap';
    actionsBar.style.gap = '0.75rem';
    actionsBar.style.marginBottom = '1.25rem';

    actionsBar.innerHTML = `
        <button type="button" class="btn btn-primary" id="leDownloadZipBtn" style="flex: 1; min-width: 200px; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.65rem 1.2rem; font-weight: 700; border-radius: 8px; background: linear-gradient(135deg, #e11d48, #be123c); cursor: pointer; color: white; border: none;">
            <i class="fa-solid fa-file-zipper"></i> Download ZIP Package
        </button>
        <button type="button" class="btn btn-success" id="leDownloadMergedBtn" style="flex: 1; min-width: 200px; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.65rem 1.2rem; font-weight: 700; border-radius: 8px; background: linear-gradient(135deg, #059669, #10b981); cursor: pointer; color: white; border: none;">
            <i class="fa-solid fa-file-excel"></i> Download Merged Excel (${filesList.length} Sheets)
        </button>
    `;
    container.appendChild(actionsBar);

    // Bind Download Buttons
    const dlZipBtn = actionsBar.querySelector('#leDownloadZipBtn');
    if (dlZipBtn) {
        dlZipBtn.addEventListener('click', () => {
            if (leZipBlob) {
                triggerDownload(leZipBlob, zipFilename);
                leLog(`Downloaded complete ZIP package: ${zipFilename}`, 'info');
            }
        });
    }

    const dlMergedBtn = actionsBar.querySelector('#leDownloadMergedBtn');
    if (dlMergedBtn) {
        dlMergedBtn.addEventListener('click', () => {
            if (mergedBlob) {
                triggerDownload(mergedBlob, mergedFilename);
                leLog(`Downloaded Merged Excel file: ${mergedFilename}`, 'info');
            }
        });
    }

    // 3. Processed Files Table Card
    const tableCard = document.createElement('div');
    tableCard.style.background = 'white';
    tableCard.style.border = '1px solid var(--border-color)';
    tableCard.style.borderRadius = '12px';
    tableCard.style.overflow = 'hidden';
    tableCard.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';

    const tableHeader = document.createElement('div');
    tableHeader.style.padding = '0.75rem 1rem';
    tableHeader.style.borderBottom = '1px solid var(--border-color)';
    tableHeader.style.background = '#f8fafc';
    tableHeader.style.display = 'flex';
    tableHeader.style.justifyContent = 'space-between';
    tableHeader.style.alignItems = 'center';
    tableHeader.innerHTML = `
        <span style="font-size: 0.85rem; font-weight: 700; color: #1e293b;"><i class="fa-solid fa-table-list text-rose" style="color: #e11d48;"></i> Processed Loss Details Files (${filesList.length})</span>
        <span style="font-size: 0.75rem; color: var(--text-muted);">Column F (Order date) successfully updated</span>
    `;
    tableCard.appendChild(tableHeader);

    const tableWrap = document.createElement('div');
    tableWrap.style.overflowX = 'auto';
    tableWrap.style.overflowY = 'auto';
    tableWrap.style.maxHeight = '280px';
    tableWrap.style.webkitOverflowScrolling = 'touch';

    const table = document.createElement('table');
    table.className = 'preview-table';
    table.style.width = '100%';
    table.style.minWidth = '720px';
    table.style.fontSize = '0.82rem';

    table.innerHTML = `
        <thead style="position: sticky; top: 0; z-index: 2; background: #f8fafc;">
            <tr>
                <th style="width: 40px; text-align: center; background: #f8fafc;">#</th>
                <th style="background: #f8fafc;">Details File Name</th>
                <th style="background: #f8fafc;">Sheet Name</th>
                <th style="text-align: center; background: #f8fafc;">Total Rows</th>
                <th style="text-align: center; background: #f8fafc;">Matched Dates</th>
                <th style="text-align: center; background: #f8fafc;">Unmatched</th>
                <th style="text-align: center; background: #f8fafc;">Status</th>
                <th style="text-align: center; width: 140px; background: #f8fafc;">Actions</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    filesList.forEach((file, idx) => {
        const tr = document.createElement('tr');
        const matchRate = file.totalRows > 0 ? Math.round((file.matched / file.totalRows) * 100) : 0;
        const isFullMatch = file.unmatched === 0;

        tr.innerHTML = `
            <td style="text-align: center; font-weight: 700; color: var(--text-muted);">${idx + 1}</td>
            <td style="font-weight: 600; color: var(--text-primary);">
                <i class="fa-solid fa-file-excel text-rose" style="color: #e11d48; margin-right: 0.35rem;"></i>
                ${file.name}
            </td>
            <td style="color: #64748b; font-family: monospace; font-size: 0.78rem;">[${file.sheetName}]</td>
            <td style="text-align: center; font-weight: 700;">${file.totalRows}</td>
            <td style="text-align: center; font-weight: 700; color: #15803d;">${file.matched}</td>
            <td style="text-align: center; font-weight: 700; color: ${file.unmatched > 0 ? '#b45309' : '#64748b'};">${file.unmatched}</td>
            <td style="text-align: center;">
                <span style="font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 6px; background: ${isFullMatch ? '#dcfce7' : '#fef3c7'}; color: ${isFullMatch ? '#15803d' : '#b45309'}; border: 1px solid ${isFullMatch ? '#86efac' : '#fde68a'};">
                    ${matchRate}% Matched
                </span>
            </td>
            <td style="text-align: center;">
                <div style="display: flex; gap: 0.35rem; justify-content: center;">
                    <button type="button" class="btn le-dl-single" style="padding: 0.3rem 0.6rem; font-size: 0.75rem; border-radius: 6px; background: #ffe4e6; color: #e11d48; border: 1px solid #fecdd3; cursor: pointer;" title="Download this file">
                        <i class="fa-solid fa-download"></i>
                    </button>
                    <button type="button" class="btn le-preview-single" style="padding: 0.3rem 0.6rem; font-size: 0.75rem; border-radius: 6px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; cursor: pointer;" title="Preview Excel data">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
            </td>
        `;

        const dlBtn = tr.querySelector('.le-dl-single');
        if (dlBtn) {
            dlBtn.addEventListener('click', () => {
                triggerDownload(file.blob, file.name);
                leLog(`Downloaded: ${file.name}`, 'info');
            });
        }

        const prevBtn = tr.querySelector('.le-preview-single');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                openRenFileInspector({
                    name: file.name,
                    fileObj: file.blob,
                    parsedAOA: file.aoa
                });
            });
        }

        tbody.appendChild(tr);
    });

    tableWrap.appendChild(table);
    tableCard.appendChild(tableWrap);
    container.appendChild(tableCard);
}

async function runLossErrorProcess() {
    if (leDetailsFiles.length === 0 || !leDataFile) return;

    const btn = document.getElementById('leBtn');
    const progressCard = document.getElementById('leProgressCard');
    const progressBar = document.getElementById('leProgressBar');
    const progressPercent = document.getElementById('leProgressPercent');
    const progressStepText = document.getElementById('leProgressStepText');
    const container = document.getElementById('leOutputContainer');

    if (btn) btn.setAttribute('disabled', 'true');
    if (progressCard) progressCard.classList.remove('hidden');
    if (progressBar) progressBar.style.width = '5%';
    if (progressPercent) progressPercent.innerText = '5%';
    if (progressStepText) progressStepText.innerText = 'Reading Myntra Data file...';

    if (container) {
        container.innerHTML = `
            <div class="empty-output-state">
                <i class="fa-solid fa-spinner fa-spin placeholder-icon" style="color: #e11d48;"></i>
                <p>Processing Loss Details and matching with Myntra Data file...</p>
            </div>
        `;
    }

    try {
        leLog('Starting Loss Error Process...', 'process');
        leLog(`Selected Details Files: ${leDetailsFiles.length}`, 'info');
        leLog(`Selected Myntra Data File: ${leDataFile.name}`, 'info');

        // Step 1: Read and Index the Myntra Data File (Col E -> Col C)
        if (progressBar) progressBar.style.width = '12%';
        if (progressPercent) progressPercent.innerText = '12%';
        if (progressStepText) progressStepText.innerText = 'Parsing Myntra Data spreadsheet...';

        const dataBuffer = await readFileAsArrayBuffer(leDataFile);
        const dataWb = XLSX.read(dataBuffer, { type: 'array', cellDates: true });
        
        let dataSheetName = dataWb.SheetNames[0];
        for (const sName of dataWb.SheetNames) {
            const low = sName.toLowerCase();
            if (low.includes('data') || low.includes('myntra')) {
                dataSheetName = sName;
                break;
            }
        }

        const dataWs = dataWb.Sheets[dataSheetName];
        const dataAoa = XLSX.utils.sheet_to_json(dataWs, { header: 1, defval: "" });
        leLog(`Loaded Myntra Data sheet [${dataSheetName}] with ${dataAoa.length} rows.`, 'info');

        if (dataAoa.length < 2) {
            throw new Error(`Myntra Data sheet [${dataSheetName}] is empty or has no data rows.`);
        }

        // Locate Data header row
        let dataHeaderRowIndex = -1;
        for (let i = 0; i < Math.min(dataAoa.length, 10); i++) {
            const row = dataAoa[i];
            if (row && row.some(cell => {
                const str = String(cell || "").trim().toLowerCase();
                return str.includes("seller invoice") || str.includes("seller order") || str.includes("customer order") || str.includes("order date") || str.includes("invoice");
            })) {
                dataHeaderRowIndex = i;
                break;
            }
        }
        if (dataHeaderRowIndex === -1) {
            dataHeaderRowIndex = 1; // Default row 2 (index 1)
        }

        const dataHeaderRow = dataAoa[dataHeaderRowIndex] || [];
        let invoiceColE = 4; // Column E default
        let dateColC = 2;    // Column C default

        for (let c = 0; c < dataHeaderRow.length; c++) {
            const val = String(dataHeaderRow[c] || "").trim().toLowerCase().replace(/[\._\-\s]+/g, " ");
            if ((val === "seller order no" || val === "seller invoice no" || val.includes("seller invoice") || val.includes("seller order") || val.includes("invoice no")) && !val.includes("date")) {
                invoiceColE = c;
            } else if ((val === "cust order date" || val === "order date" || val.includes("order date") || val.includes("cust order")) && !val.includes("invoice")) {
                dateColC = c;
            }
        }

        leLog(`Myntra Data Columns: Invoice Col = Index ${invoiceColE} (Col E), Date Col = Index ${dateColC} (Col C)`, 'info');

        // Build Key -> Date Map from Myntra Data
        const myntraDataMap = new Map();
        for (let r = dataHeaderRowIndex + 1; r < dataAoa.length; r++) {
            const row = dataAoa[r];
            if (!row || row.length === 0) continue;
            const invVal = row[invoiceColE];
            const dateVal = row[dateColC];

            const formattedDate = formatLossDateVal(dateVal);
            const cleanInv = cleanLossKeyVal(invVal);

            if (cleanInv && formattedDate && !myntraDataMap.has(cleanInv)) {
                myntraDataMap.set(cleanInv, formattedDate);
            }
        }

        leLog(`Indexed ${myntraDataMap.size} records from Myntra Data file.`, 'success');

        // Step 2: Process Each Loss Details File
        const zip = new JSZip();
        const mergedWb = XLSX.utils.book_new();
        const usedSheetNames = new Set();
        const processedFilesList = [];

        let totalProcessedRows = 0;
        let totalMatchedDates = 0;
        let totalUnmatchedDates = 0;

        for (let fIdx = 0; fIdx < leDetailsFiles.length; fIdx++) {
            const fileObj = leDetailsFiles[fIdx];
            const progressVal = Math.round(20 + ((fIdx + 1) / leDetailsFiles.length) * 60);
            if (progressBar) progressBar.style.width = `${progressVal}%`;
            if (progressPercent) progressPercent.innerText = `${progressVal}%`;
            if (progressStepText) progressStepText.innerText = `Processing [${fIdx + 1}/${leDetailsFiles.length}] ${fileObj.name}...`;

            leLog(`[${fIdx + 1}/${leDetailsFiles.length}] Processing Loss file: "${fileObj.name}"...`, 'process');

            const fileBuffer = await readFileAsArrayBuffer(fileObj.file);
            const fileWb = XLSX.read(fileBuffer, { type: 'array', cellDates: true });
            const fileWs = fileWb.Sheets[fileWb.SheetNames[0]];
            const fileAoa = XLSX.utils.sheet_to_json(fileWs, { header: 1, defval: "" });

            if (fileAoa.length === 0) {
                leLog(`Warning: File "${fileObj.name}" is completely empty. Skipping.`, 'warning');
                continue;
            }

            const baseFileName = fileObj.name.replace(/\.[^/.]+$/, "").trim();

            // Detect Header Row vs Title Row
            let headerRowIndex = 0;
            let hasExistingTitle = false;

            for (let i = 0; i < Math.min(fileAoa.length, 5); i++) {
                const row = fileAoa[i] || [];
                const isHeader = row.some(cell => {
                    const str = String(cell || "").trim().toLowerCase();
                    return str.includes("invoice id") || str.includes("order id") || str.includes("sale price") || str.includes("difference") || str.includes("sale invoice");
                });
                if (isHeader) {
                    headerRowIndex = i;
                    if (i > 0) hasExistingTitle = true;
                    break;
                }
            }

            let workingAoa = [];

            if (!hasExistingTitle) {
                // Row 1: Merged Title banner with file name
                workingAoa.push([baseFileName, "", "", "", "", "", ""]);
                // Row 2: Headers
                const originalHeaders = fileAoa[headerRowIndex] || [];
                const standardHeaders = [
                    originalHeaders[0] || "Invoice ID",
                    originalHeaders[1] || "Order ID",
                    originalHeaders[2] || "Sale Price/Amt",
                    originalHeaders[3] || "Purchase Price/Amt",
                    originalHeaders[4] || "Difference",
                    "Order date", // Col F (index 5)
                    originalHeaders[6] || originalHeaders[5] || "Sale Invoice ID" // Col G (index 6)
                ];
                workingAoa.push(standardHeaders);

                // Data rows starting from original index + 1
                for (let r = headerRowIndex + 1; r < fileAoa.length; r++) {
                    const origRow = fileAoa[r];
                    if (!origRow || origRow.length === 0 || origRow.every(c => c === "" || c === null || c === undefined)) continue;
                    
                    const newRow = [
                        origRow[0] !== undefined ? origRow[0] : "",
                        origRow[1] !== undefined ? origRow[1] : "",
                        origRow[2] !== undefined ? origRow[2] : "",
                        origRow[3] !== undefined ? origRow[3] : "",
                        origRow[4] !== undefined ? origRow[4] : "",
                        "", // Order date placeholder (Col F / index 5)
                        origRow[6] !== undefined ? origRow[6] : (origRow[5] !== undefined ? origRow[5] : "") // Sale Invoice ID (Col G / index 6)
                    ];
                    workingAoa.push(newRow);
                }
            } else {
                workingAoa.push([baseFileName, "", "", "", "", "", ""]);
                const headerRow = fileAoa[headerRowIndex] || [];
                while (headerRow.length < 7) headerRow.push("");
                headerRow[5] = "Order date";
                if (!headerRow[6] || String(headerRow[6]).trim() === "") {
                    headerRow[6] = "Sale Invoice ID";
                }
                workingAoa.push(headerRow);

                for (let r = headerRowIndex + 1; r < fileAoa.length; r++) {
                    const origRow = fileAoa[r];
                    if (!origRow || origRow.length === 0 || origRow.every(c => c === "" || c === null || c === undefined)) continue;
                    while (origRow.length < 7) origRow.push("");
                    workingAoa.push([...origRow]);
                }
            }

            // Locate Column Positions
            const headerCells = workingAoa[1] || [];
            let colG_SaleInvoice = 6; // Col G default
            let colB_OrderId = 1;     // Col B default
            let colF_OrderDate = 5;   // Col F default

            for (let c = 0; c < headerCells.length; c++) {
                const hVal = String(headerCells[c] || "").trim().toLowerCase();
                if (hVal.includes("sale invoice") || hVal.includes("invoice id")) {
                    if (c >= 5) colG_SaleInvoice = c;
                } else if (hVal.includes("order id") || hVal === "order no") {
                    colB_OrderId = c;
                } else if (hVal.includes("order date") || hVal.includes("cust order date")) {
                    colF_OrderDate = c;
                }
            }

            workingAoa[1][colF_OrderDate] = "Order date";

            let fileMatched = 0;
            let fileUnmatched = 0;
            let fileTotalRows = 0;

            for (let r = 2; r < workingAoa.length; r++) {
                const row = workingAoa[r];
                if (!row || row.length === 0) continue;
                fileTotalRows++;

                // Rule: Strictly take Invoice No from Column G (index 6), match in Myntra Data (Col E), write into Column F (index 5)
                const saleInvoiceVal = row[colG_SaleInvoice];
                const cleanG = cleanLossKeyVal(saleInvoiceVal);

                let matchedDate = myntraDataMap.get(cleanG) || "";

                while (row.length <= colF_OrderDate) row.push("");
                row[colF_OrderDate] = matchedDate || "";

                // Pure text on Order ID (Col B)
                row[colB_OrderId] = toPureText(row[colB_OrderId]);

                if (matchedDate) {
                    fileMatched++;
                } else {
                    fileUnmatched++;
                }
            }

            totalProcessedRows += fileTotalRows;
            totalMatchedDates += fileMatched;
            totalUnmatchedDates += fileUnmatched;

            leLog(`[${fileObj.name}] Done: ${fileTotalRows} rows [${fileMatched} dates matched, ${fileUnmatched} unmatched]`, fileUnmatched === 0 ? 'success' : 'info');

            const updatedWs = XLSX.utils.aoa_to_sheet(workingAoa);
            const endCol = Math.max(6, (workingAoa[1] ? workingAoa[1].length - 1 : 6));
            updatedWs['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: endCol } }
            ];

            formatLossWorksheet(updatedWs);

            let safeSheetName = getSafeSheetName(baseFileName);
            if (usedSheetNames.has(safeSheetName)) {
                let cnt = 2;
                let altName = safeSheetName.slice(0, 28) + `_${cnt}`;
                while (usedSheetNames.has(altName)) {
                    cnt++;
                    altName = safeSheetName.slice(0, 28) + `_${cnt}`;
                }
                safeSheetName = altName;
            }
            usedSheetNames.add(safeSheetName);

            // Add to Merged Workbook
            XLSX.utils.book_append_sheet(mergedWb, updatedWs, safeSheetName);

            // Create Single Updated Workbook
            const singleWb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(singleWb, updatedWs, safeSheetName);
            const singleBuffer = XLSX.write(singleWb, { bookType: 'xlsx', type: 'array' });
            const singleBlob = new Blob([singleBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

            const outputSingleFilename = `${baseFileName}.xlsx`;
            zip.file(outputSingleFilename, singleBuffer);

            processedFilesList.push({
                name: outputSingleFilename,
                sheetName: safeSheetName,
                totalRows: fileTotalRows,
                matched: fileMatched,
                unmatched: fileUnmatched,
                blob: singleBlob,
                aoa: workingAoa
            });

            // Register into Error Dispute Tracker
            const partyOrWhName = baseFileName.replace(/Myntra|Loss|Report|Dispute/gi, '').trim() || baseFileName;
            registerTrackedError('loss', fileObj.name, partyOrWhName, 'Loss Report Dispute', fileTotalRows);
        }

        if (processedFilesList.length === 0) {
            throw new Error("No Loss Details files could be processed.");
        }

        // Finalize Merged Excel & ZIP Bundle
        if (progressBar) progressBar.style.width = '85%';
        if (progressPercent) progressPercent.innerText = '85%';
        if (progressStepText) progressStepText.innerText = 'Finalizing Merged Excel and ZIP package...';

        const timestamp = new Date().toISOString().slice(0, 10).replace(/[-:]/g, '_');
        leMergedFilename = `Merged_Loss_Errors_${timestamp}.xlsx`;
        leZipFilename = `myntra_loss_error_bundle_${timestamp}.zip`;

        const mergedBuffer = XLSX.write(mergedWb, { bookType: 'xlsx', type: 'array' });
        leMergedBlob = new Blob([mergedBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        zip.file(leMergedFilename, mergedBuffer);

        leZipBlob = await zip.generateAsync({ type: 'blob' });

        if (progressBar) progressBar.style.width = '100%';
        if (progressPercent) progressPercent.innerText = '100% Completed';
        if (progressStepText) progressStepText.innerText = 'All loss files processed successfully!';

        leLog(`Successfully completed! ${processedFilesList.length} files processed. Total: ${totalProcessedRows} rows (${totalMatchedDates} dates matched).`, 'success');
        leLog(`Merged Excel created: "${leMergedFilename}" (${formatBytes(leMergedBlob.size)})`, 'success');
        leLog(`ZIP Package created: "${leZipFilename}" (${formatBytes(leZipBlob.size)})`, 'success');

        renderLeDashboard(
            processedFilesList,
            leMergedBlob,
            leZipFilename,
            leMergedFilename,
            {
                totalFiles: processedFilesList.length,
                totalRows: totalProcessedRows,
                totalMatched: totalMatchedDates,
                totalUnmatched: totalUnmatchedDates
            }
        );

        showToast(`Loss Error Process Completed! ${totalMatchedDates} of ${totalProcessedRows} records matched.`, 'success');

    } catch (err) {
        console.error('Loss process error:', err);
        leLog(`Loss process failed: ${err.message}`, 'error');
        showToast(`Loss process error: ${err.message}`, 'error');
        if (container) {
            container.innerHTML = `
                <div class="empty-output-state">
                    <i class="fa-solid fa-circle-exclamation placeholder-icon" style="color: #ef4444;"></i>
                    <p style="color: #ef4444; font-weight: 600;">Error: ${err.message}</p>
                </div>
            `;
        }
    } finally {
        if (btn) btn.removeAttribute('disabled');
    }
}


// ==========================
// FOLDER CREATE TAB LOGIC
// ==========================

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper to recursively traverse dragged folders and get files
async function getFilesFromDataTransfer(dataTransfer) {
    console.log("getFilesFromDataTransfer: Started traversal. dataTransfer =", dataTransfer);
    const files = [];
    
    // Helper to read directory entries
    const readDirectory = (dirEntry) => {
        return new Promise((resolve) => {
            const reader = dirEntry.createReader();
            const allEntries = [];
            
            const readEntries = () => {
                reader.readEntries((entries) => {
                    if (entries.length === 0) {
                        resolve(allEntries);
                    } else {
                        allEntries.push(...entries);
                        readEntries();
                    }
                }, () => resolve([]));
            };
            readEntries();
        });
    };
    
    // Helper to get file from file entry
    const getFile = (fileEntry) => {
        return new Promise((resolve) => {
            fileEntry.file((file) => resolve(file), () => resolve(null));
        });
    };
    
    // Recursive traverse
    const traverse = async (entry, path = "") => {
        console.log("Traversing entry:", entry.name, "isFile:", entry.isFile, "isDirectory:", entry.isDirectory, "currentPath:", path);
        if (entry.isFile) {
            const file = await getFile(entry);
            if (file) {
                file.customRelativePath = path ? `${path}/${file.name}` : file.name;
                console.log("Found file entry:", file.name, "customRelativePath:", file.customRelativePath);
                files.push(file);
            }
        } else if (entry.isDirectory) {
            const entries = await readDirectory(entry);
            const nextPath = path ? `${path}/${entry.name}` : entry.name;
            console.log("Found directory entry:", entry.name, "contains entries count:", entries.length, "nextPath:", nextPath);
            for (const subEntry of entries) {
                await traverse(subEntry, nextPath);
            }
        }
    };
    
    const items = dataTransfer.items;
    const entries = [];
    
    if (items) {
        console.log("dataTransfer.items found. count =", items.length);
        for (let i = 0; i < items.length; i++) {
            try {
                const entry = items[i].webkitGetAsEntry();
                console.log("Item index", i, "entryName =", entry ? entry.name : "null");
                if (entry) {
                    entries.push(entry);
                }
            } catch (err) {
                console.warn("Error getting webkitGetAsEntry at index", i, err);
            }
        }
    }
    
    if (entries.length > 0) {
        console.log("Synchronously extracted entries count =", entries.length, ". Starting async traversal...");
        for (const entry of entries) {
            await traverse(entry);
        }
    } else {
        console.log("No webkitGetAsEntry entries found or items was empty. Falling back to dataTransfer.files...");
        const list = Array.from(dataTransfer.files);
        list.forEach(file => {
            file.customRelativePath = file.webkitRelativePath || file.name;
            files.push(file);
        });
    }
    
    console.log("getFilesFromDataTransfer finished. Total files parsed =", files.length);
    return files;
}

function switchFldMode(mode) {
    if (fldMode === mode) return;
    fldMode = mode;
    
    // Clear list
    fldUploadedFiles = [];
    resetFolderCreateButtonState();
    
    const fldFileInput = document.getElementById('fld-file-input');
    const fldFolderInput = document.getElementById('fld-folder-input');
    const fldUploadTitle = document.getElementById('fld-upload-title');
    const fldFileSupportText = document.getElementById('fld-file-support-text');
    const fldModeFilesBtn = document.getElementById('fld-mode-files-btn');
    const fldModeFoldersBtn = document.getElementById('fld-mode-folders-btn');
    
    // Clear preview table and hide it
    const fldEmptyState = document.getElementById('fld-empty-state');
    const fldTableContainer = document.getElementById('fld-table-container');
    const fldPreviewTbody = document.getElementById('fld-preview-tbody');
    const fldFileCount = document.getElementById('fld-file-count');
    const fldProgress = document.getElementById('fld-progress');
    const btnFldRun = document.getElementById('btn-fld-run');
    
    if (fldEmptyState) fldEmptyState.classList.remove('hidden');
    if (fldTableContainer) fldTableContainer.classList.add('hidden');
    if (fldPreviewTbody) fldPreviewTbody.innerHTML = '';
    if (fldFileCount) fldFileCount.textContent = '0 files loaded';
    if (fldProgress) fldProgress.classList.add('hidden');
    if (btnFldRun) btnFldRun.classList.add('hidden');
    
    // Update active tab buttons
    if (fldModeFilesBtn && fldModeFoldersBtn) {
        if (mode === 'files') {
            fldModeFilesBtn.classList.add('active');
            fldModeFoldersBtn.classList.remove('active');
        } else {
            fldModeFoldersBtn.classList.add('active');
            fldModeFilesBtn.classList.remove('active');
        }
    }
    
    // Adjust file/folder input visibility and labels
    if (mode === 'files') {
        if (fldFileInput) fldFileInput.style.display = 'block';
        if (fldFolderInput) fldFolderInput.style.display = 'none';
        if (fldUploadTitle) fldUploadTitle.textContent = "Upload Files to Group";
        if (fldFileSupportText) fldFileSupportText.textContent = "Supports .xlsx, .xls, .csv files";
        const selectBtn = document.getElementById('btn-fld-select-files');
        if (selectBtn) selectBtn.textContent = "Select Files";
        const fldFileLabel = document.getElementById('fld-file-label');
        if (fldFileLabel) fldFileLabel.textContent = "Drag & Drop files here";
    } else {
        if (fldFileInput) fldFileInput.style.display = 'none';
        if (fldFolderInput) fldFolderInput.style.display = 'block';
        if (fldUploadTitle) fldUploadTitle.textContent = "Upload Folders Directly";
        if (fldFileSupportText) fldFileSupportText.textContent = "Select multiple folders to zip & summarize";
        const selectBtn = document.getElementById('btn-fld-select-files');
        if (selectBtn) selectBtn.textContent = "Select Folder";
        const fldFileLabel = document.getElementById('fld-file-label');
        if (fldFileLabel) fldFileLabel.textContent = "Drag & Drop folders here";
    }
    
    updateFldSelectedUI();
}

function updateFldSelectedUI() {
    const fldSelectedCard = document.getElementById('fld-selected-card');
    const fldSelectedCount = document.getElementById('fld-selected-count');
    const fldSelectedList = document.getElementById('fld-selected-list');
    
    if (!fldSelectedCard || !fldSelectedCount || !fldSelectedList) return;
    
    if (fldUploadedFiles.length > 0) {
        fldSelectedCard.style.display = 'flex';
        fldSelectedCount.textContent = fldUploadedFiles.length;
        fldSelectedList.innerHTML = '';
        
        fldUploadedFiles.forEach((fileData, index) => {
            const item = document.createElement('div');
            item.className = 'fld-file-item';
            
            const details = document.createElement('div');
            details.className = 'fld-file-details';
            
            const fileIcon = document.createElement('span');
            fileIcon.className = 'file-icon';
            fileIcon.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-secondary);"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'fld-file-name';
            const relativePath = fileData.relativePath || fileData.name;
            nameSpan.textContent = relativePath;
            
            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'fld-file-size';
            sizeSpan.textContent = fileData.fileObj ? `(${formatBytes(fileData.fileObj.size)})` : '';
            
            details.appendChild(fileIcon);
            details.appendChild(nameSpan);
            details.appendChild(sizeSpan);
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn-remove-fld-file';
            removeBtn.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showDeleteConfirmation({
                    title: "Delete File?",
                    message: `Are you sure you want to remove "${fileData.name}" from Folder Create list?`,
                    onConfirm: () => {
                        fldUploadedFiles.splice(index, 1);
                        updateFldSelectedUI();
                        recalculateFldGroupsAndPreview();
                        showToast(`File "${fileData.name}" removed.`, "info");
                    }
                });
            });
            
            item.appendChild(details);
            item.appendChild(removeBtn);
            fldSelectedList.appendChild(item);
        });
    } else {
        fldSelectedCard.style.display = 'none';
        fldSelectedCount.textContent = '0';
        fldSelectedList.innerHTML = '';
    }
}

// ==========================================
// FOLDER CREATE TAB (1-Hour Session, Accordion, Copy/Paste to Error Folders, Full View, Move to Processor)
// ==========================================

let fldExpandedFolders = new Set();
let fldSessionTimerInterval = null;
let fldActiveCopyFile = null; // { fileObj, name, folderPrefix }
let fldActiveManualTargetFolder = null; // folderPrefix
let fldActiveEditFile = null; // fileData
let fldFullViewFilter = 'all'; // 'all', 'complete', 'missing'

// IndexedDB Session Storage Config (1 Hour Expiry) for Folder Create Tab
const FLD_DB_NAME = 'MyntraFolderCreateCacheDB';
const FLD_DB_STORE = 'folderSession';
const FLD_DB_VERSION = 1;
const FLD_SESSION_EXPIRY_MS = 60 * 60 * 1000; // 1 Hour

function openFolderCreateDB() {
    return new Promise((resolve) => {
        if (!window.indexedDB) {
            resolve(null);
            return;
        }
        try {
            const req = indexedDB.open(FLD_DB_NAME, FLD_DB_VERSION);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(FLD_DB_STORE)) {
                    db.createObjectStore(FLD_DB_STORE, { keyPath: 'id' });
                }
            };
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = () => resolve(null);
        } catch (e) {
            resolve(null);
        }
    });
}

async function saveFolderCreateSessionToStorage() {
    try {
        const db = await openFolderCreateDB();
        if (!db) return;

        if (fldUploadedFiles.length === 0) {
            const tx = db.transaction([FLD_DB_STORE], 'readwrite');
            tx.objectStore(FLD_DB_STORE).delete('currentSession');
            hideFldSessionBanner();
            return;
        }

        const serializedFiles = fldUploadedFiles.map(f => ({
            name: f.name,
            ext: f.ext,
            folderName: f.folderName || '',
            relativePath: f.relativePath || '',
            blob: f.fileObj
        }));

        const expiresAt = Date.now() + FLD_SESSION_EXPIRY_MS;
        const sessionData = {
            id: 'currentSession',
            timestamp: Date.now(),
            expiresAt: expiresAt,
            fldMode: fldMode,
            files: serializedFiles
        };

        const tx = db.transaction([FLD_DB_STORE], 'readwrite');
        tx.objectStore(FLD_DB_STORE).put(sessionData);
        startFldSessionTimer(expiresAt);
    } catch (err) {
        console.warn("Folder Create IndexedDB save error:", err);
    }
}

async function loadFolderCreateSessionFromStorage() {
    try {
        const db = await openFolderCreateDB();
        if (!db) return;

        const tx = db.transaction([FLD_DB_STORE], 'readonly');
        const store = tx.objectStore(FLD_DB_STORE);
        const req = store.get('currentSession');

        req.onsuccess = async () => {
            const data = req.result;
            if (!data) return;

            const now = Date.now();
            if (now > data.expiresAt) {
                clearFolderCreateSessionStorage();
                return;
            }

            if (data.files && data.files.length > 0) {
                fldUploadedFiles = data.files.map(f => {
                    let fileBlob = f.blob;
                    if (!(fileBlob instanceof Blob)) {
                        fileBlob = new Blob([f.blob]);
                    }
                    return {
                        name: f.name,
                        ext: f.ext,
                        folderName: f.folderName,
                        relativePath: f.relativePath,
                        fileObj: fileBlob
                    };
                });

                if (data.fldMode) {
                    fldMode = data.fldMode;
                }

                updateFldSelectedUI();
                recalculateFldGroupsAndPreview();
                startFldSessionTimer(data.expiresAt);
                showToast(`Restored ${fldUploadedFiles.length} folder files from 1-hour session cache!`, "info");
            }
        };
    } catch (err) {
        console.warn("Folder Create IndexedDB load error:", err);
    }
}

async function clearFolderCreateSessionStorage() {
    try {
        const db = await openFolderCreateDB();
        if (!db) return;
        const tx = db.transaction([FLD_DB_STORE], 'readwrite');
        tx.objectStore(FLD_DB_STORE).delete('currentSession');
        hideFldSessionBanner();
    } catch (err) {
        console.warn("Folder Create IndexedDB clear error:", err);
    }
}

function startFldSessionTimer(expiresAt) {
    const banner = document.getElementById('fld-session-banner');
    const timerElem = document.getElementById('fld-session-timer');
    if (!banner || !timerElem) return;

    banner.classList.remove('hidden');

    if (fldSessionTimerInterval) clearInterval(fldSessionTimerInterval);

    const updateTimer = () => {
        const remainingMs = expiresAt - Date.now();
        if (remainingMs <= 0) {
            timerElem.textContent = "Session expired";
            clearInterval(fldSessionTimerInterval);
            clearFolderCreateSessionStorage();
            return;
        }
        const mins = Math.floor(remainingMs / (60 * 1000));
        const secs = Math.floor((remainingMs % (60 * 1000)) / 1000);
        timerElem.textContent = `Auto-clears in ${mins}m ${secs}s`;
    };

    updateTimer();
    fldSessionTimerInterval = setInterval(updateTimer, 1000);
}

function hideFldSessionBanner() {
    const banner = document.getElementById('fld-session-banner');
    if (banner) banner.classList.add('hidden');
    if (fldSessionTimerInterval) {
        clearInterval(fldSessionTimerInterval);
        fldSessionTimerInterval = null;
    }
}

// Compute prefix groups from current uploaded files
function getFldPrefixGroups() {
    const groups = new Map();
    if (fldMode === 'files') {
        fldUploadedFiles.forEach((fileData, fileIndex) => {
            const name = fileData.name;
            let prefix = "Ungrouped";
            if (name.includes("-")) {
                prefix = name.split("-")[0].trim();
            }
            if (prefix === "") prefix = "Ungrouped";
            if (!groups.has(prefix)) {
                groups.set(prefix, []);
            }
            groups.get(prefix).push({ ...fileData, originalIndex: fileIndex });
        });
    } else {
        fldUploadedFiles.forEach((fileData, fileIndex) => {
            const folderName = fileData.folderName || "Ungrouped";
            if (!groups.has(folderName)) {
                groups.set(folderName, []);
            }
            groups.get(folderName).push({ ...fileData, originalIndex: fileIndex });
        });
    }
    return groups;
}

// Sort prefixes with Error/Missing folders (< 3 files) always on top!
function getSortedFldPrefixes(groups, priorityError = true) {
    const prefixes = Array.from(groups.keys());
    prefixes.sort((a, b) => {
        if (priorityError) {
            const countA = (groups.get(a) || []).length;
            const countB = (groups.get(b) || []).length;
            const isMissingA = countA < 3 ? 1 : 0;
            const isMissingB = countB < 3 ? 1 : 0;
            if (isMissingA !== isMissingB) {
                return isMissingB - isMissingA; // Missing folders (1) come before complete folders (0)
            }
        }
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
    return prefixes;
}

function recalculateFldGroupsAndPreview() {
    const fldEmptyState = document.getElementById('fld-empty-state');
    const fldTableContainer = document.getElementById('fld-table-container');
    const fldPreviewTbody = document.getElementById('fld-preview-tbody');
    const fldFileCount = document.getElementById('fld-file-count');
    const fldMissingBadge = document.getElementById('fld-missing-badge');
    const fldHeaderActions = document.getElementById('fld-header-actions');
    const btnFldRun = document.getElementById('btn-fld-run');

    if (fldUploadedFiles.length === 0) {
        if (fldEmptyState) fldEmptyState.classList.remove('hidden');
        if (fldTableContainer) fldTableContainer.classList.add('hidden');
        if (fldHeaderActions) fldHeaderActions.classList.add('hidden');
        if (fldMissingBadge) fldMissingBadge.classList.add('hidden');
        if (fldFileCount) fldFileCount.textContent = '0 files loaded';
        if (btnFldRun) btnFldRun.classList.add('hidden');
        return;
    }

    const groups = getFldPrefixGroups();
    const sortedPrefixes = getSortedFldPrefixes(groups, true); // Error folders always on top

    let missingFoldersCount = 0;
    sortedPrefixes.forEach(prefix => {
        const filesInGroup = groups.get(prefix);
        if (filesInGroup.length < 3) {
            missingFoldersCount++;
        }
    });

    if (fldFileCount) {
        fldFileCount.textContent = `${fldUploadedFiles.length} files (${sortedPrefixes.length} folders)`;
    }

    if (fldMissingBadge) {
        if (missingFoldersCount > 0) {
            fldMissingBadge.textContent = `⚠️ ${missingFoldersCount} Missing / Error`;
            fldMissingBadge.classList.remove('hidden');
        } else {
            fldMissingBadge.textContent = `✅ All Folders Complete`;
            fldMissingBadge.style.background = "rgba(16, 185, 129, 0.12)";
            fldMissingBadge.style.color = "#10b981";
            fldMissingBadge.style.borderColor = "rgba(16, 185, 129, 0.25)";
            fldMissingBadge.classList.remove('hidden');
        }
    }

    if (fldEmptyState) fldEmptyState.classList.add('hidden');
    if (fldTableContainer) fldTableContainer.classList.remove('hidden');
    if (fldHeaderActions) fldHeaderActions.classList.remove('hidden');
    if (btnFldRun) btnFldRun.classList.remove('hidden');

    renderFldAccordionTable(fldPreviewTbody, sortedPrefixes, groups, false);

    // Also update full view modal if it is open
    const fldFullviewModal = document.getElementById('fld-fullview-modal');
    if (fldFullviewModal && fldFullviewModal.classList.contains('show')) {
        renderFldFullViewModalRows();
    }

    saveFolderCreateSessionToStorage();
}

// Render Folder Accordion rows and dropdown sub-tables
function renderFldAccordionTable(tbodyElement, sortedPrefixes, groups, isFullView, searchQuery = "", filterMode = "all") {
    if (!tbodyElement) return;
    tbodyElement.innerHTML = "";

    let displayedIndex = 1;

    sortedPrefixes.forEach(prefix => {
        const filesInGroup = groups.get(prefix) || [];
        const count = filesInGroup.length;
        const isComplete = count >= 3;
        const missingCount = isComplete ? 0 : (3 - count);

        // Apply status filter
        if (filterMode === 'complete' && !isComplete) return;
        if (filterMode === 'missing' && isComplete) return;

        // Apply search query
        if (searchQuery) {
            const matchesPrefix = prefix.toLowerCase().includes(searchQuery);
            const matchesFile = filesInGroup.some(f => f.name.toLowerCase().includes(searchQuery));
            if (!matchesPrefix && !matchesFile) return;
        }

        const isExpanded = fldExpandedFolders.has(prefix);
        const filesPreviewStr = filesInGroup.map(f => f.name).join(", ");

        let statusBadge = isComplete
            ? `<span class="badge success" style="background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 0.72rem; display: inline-flex; align-items: center; gap: 4px;">
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg> 3+ Files (Complete)
               </span>`
            : `<span class="badge danger" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 0.72rem; display: inline-flex; align-items: center; gap: 4px;">
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> ${count} Files (${missingCount} Missing)
               </span>`;

        // Main Folder Row
        const trFolder = document.createElement('tr');
        trFolder.className = `fld-accordion-header row-color-${(displayedIndex - 1) % 7}`;
        if (!isComplete) {
            trFolder.style.borderLeft = "4px solid #ef4444";
        } else {
            trFolder.style.borderLeft = "4px solid #10b981";
        }

        trFolder.innerHTML = `
            <td style="text-align: center; width: 35px;">
                <span class="fld-accordion-icon ${isExpanded ? 'expanded' : ''}" style="color: var(--primary); font-weight: 700; font-size: 0.8rem; cursor: pointer;">
                    ▶
                </span>
            </td>
            <td><strong>${displayedIndex++}</strong></td>
            <td>
                <span style="font-family: monospace; font-weight: 700; color: var(--text-primary); font-size: 0.84rem; display: inline-flex; align-items: center; gap: 6px;">
                    📁 ${prefix}
                </span>
            </td>
            <td><span class="badge ${isComplete ? 'badge-od' : 'badge-danger'}" style="font-weight: 700;">${count} files</span></td>
            <td>${statusBadge}</td>
            <td style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.74rem; color: var(--text-secondary);" title="${filesPreviewStr}">
                ${filesPreviewStr || '<em style="color:var(--text-muted);">Empty folder</em>'}
            </td>
            <td style="text-align: center;">
                <div style="display: inline-flex; gap: 4px;" onclick="event.stopPropagation();">
                    <button class="btn-action btn-add-file-to-folder" data-prefix="${prefix}" title="Add / Upload File directly into folder ${prefix}" style="width: 24px; height: 24px; border-radius: 6px; border: none; background: rgba(16, 185, 129, 0.1); color: #10b981; cursor: pointer;">
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                    <button class="btn-action btn-del-folder" data-prefix="${prefix}" title="Delete this entire folder group" style="width: 24px; height: 24px; border-radius: 6px; border: none; background: rgba(220, 38, 38, 0.08); color: var(--color-danger); cursor: pointer;">
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </td>
        `;

        // Toggle accordion on row click
        trFolder.addEventListener('click', (e) => {
            if (e.target.closest('.btn-action') || e.target.closest('button')) return;
            if (fldExpandedFolders.has(prefix)) {
                fldExpandedFolders.delete(prefix);
            } else {
                fldExpandedFolders.add(prefix);
            }
            if (isFullView) {
                renderFldFullViewModalRows();
            } else {
                recalculateFldGroupsAndPreview();
            }
        });

        // Add File button on folder header
        const btnAddFile = trFolder.querySelector('.btn-add-file-to-folder');
        if (btnAddFile) {
            btnAddFile.addEventListener('click', (e) => {
                e.stopPropagation();
                addManualFileToFolder(prefix);
            });
        }

        // Delete Folder button on folder header
        const btnDelFolder = trFolder.querySelector('.btn-del-folder');
        if (btnDelFolder) {
            btnDelFolder.addEventListener('click', (e) => {
                e.stopPropagation();
                showDeleteConfirmation({
                    title: `Delete Folder "${prefix}"?`,
                    message: `Are you sure you want to delete folder "${prefix}" and all its ${count} file(s)?`,
                    onConfirm: () => removeFldFolder(prefix)
                });
            });
        }

        tbodyElement.appendChild(trFolder);

        // Expanded Sub-table Row
        if (isExpanded) {
            const trSub = document.createElement('tr');
            trSub.className = 'fld-expanded-row';
            const tdSub = document.createElement('td');
            tdSub.colSpan = 7;
            tdSub.style.padding = "0.25rem 0.5rem 0.6rem 0.5rem";
            tdSub.style.background = "rgba(0,0,0,0.02)";

            const subContainer = document.createElement('div');
            subContainer.className = 'fld-accordion-subtable';

            let subTableHtml = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; padding: 0.2rem 0.4rem;">
                    <span style="font-size: 0.74rem; font-weight: 700; color: var(--primary);">📂 Files inside folder "${prefix}" (${count}/3 ${isComplete ? 'Complete ✅' : 'Missing ⚠️'}):</span>
                    <button class="btn btn-secondary btn-add-sub-file" data-prefix="${prefix}" style="padding: 0.22rem 0.6rem; font-size: 0.7rem; color: #10b981; font-weight: 700; border-color: rgba(16, 185, 129, 0.3); display: inline-flex; align-items: center; gap: 4px;">
                        <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        Add / Upload File
                    </button>
                </div>
                <table class="preview-table" style="font-size: 0.72rem; width: 100%; background: #ffffff; border-radius: 6px; border-collapse: separate; border-spacing: 0;">
                    <thead>
                        <tr style="background: #f1f5f9;">
                            <th style="width: 35px; text-align: center;">#</th>
                            <th>File Name</th>
                            <th style="width: 90px;">Size</th>
                            <th style="width: 220px; text-align: center;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            // 1. Render existing files
            filesInGroup.forEach((fileData, fileIdx) => {
                const fileSizeFormatted = fileData.fileObj ? formatBytes(fileData.fileObj.size) : '';
                subTableHtml += `
                    <tr data-file-idx="${fileData.originalIndex}">
                        <td style="text-align: center; font-weight: 600;">${fileIdx + 1}</td>
                        <td>
                            <span style="font-family: monospace; font-weight: 600; color: var(--text-primary);">
                                📄 ${fileData.name}
                            </span>
                        </td>
                        <td style="color: var(--text-secondary); font-weight: 500;">${fileSizeFormatted}</td>
                        <td style="text-align: center;">
                            <div style="display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                                <button class="btn-sub-copy btn-copy-fld-file" data-orig-idx="${fileData.originalIndex}" data-prefix="${prefix}" title="Copy/Paste this file into other folders" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 700; border-radius: 6px; border: 1px solid rgba(124, 58, 237, 0.3); background: rgba(124, 58, 237, 0.08); color: var(--primary); cursor: pointer; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; line-height: 1.2;">
                                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                    Copy/Paste
                                </button>
                                <button class="btn-sub-icon btn-edit-fld-file" data-orig-idx="${fileData.originalIndex}" title="Edit / Rename file" style="width: 26px; height: 26px; border-radius: 6px; border: 1px solid rgba(59, 130, 246, 0.25); background: rgba(59, 130, 246, 0.08); color: #2563eb; display: inline-flex; align-items: center; justify-content: center; cursor: pointer;">
                                    <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button class="btn-sub-icon btn-inspect-fld-file" data-orig-idx="${fileData.originalIndex}" title="Inspect first 50 rows" style="width: 26px; height: 26px; border-radius: 6px; border: 1px solid rgba(16, 185, 129, 0.25); background: rgba(16, 185, 129, 0.08); color: #059669; display: inline-flex; align-items: center; justify-content: center; cursor: pointer;">
                                    <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                </button>
                                <button class="btn-sub-icon btn-del-fld-file" data-orig-idx="${fileData.originalIndex}" data-filename="${fileData.name}" title="Delete file" style="width: 26px; height: 26px; border-radius: 6px; border: 1px solid rgba(220, 38, 38, 0.25); background: rgba(220, 38, 38, 0.08); color: #dc2626; display: inline-flex; align-items: center; justify-content: center; cursor: pointer;">
                                    <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            // 2. Render missing slots if folder has < 3 files
            if (count < 3) {
                for (let slotIdx = count + 1; slotIdx <= 3; slotIdx++) {
                    subTableHtml += `
                        <tr class="fld-missing-slot-row" data-prefix="${prefix}" style="background: rgba(239, 68, 68, 0.04); border-left: 3px dashed #ef4444; cursor: pointer;" title="Click to upload missing file #${slotIdx} directly into folder ${prefix}">
                            <td style="text-align: center; color: #dc2626; font-weight: 700;">${slotIdx}</td>
                            <td>
                                <span style="font-family: monospace; font-weight: 700; color: #dc2626; display: inline-flex; align-items: center; gap: 6px; font-size: 0.74rem;">
                                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                    ⚠️ Missing File #${slotIdx} (Click to upload / select)
                                </span>
                            </td>
                            <td style="color: #ef4444; font-size: 0.72rem; font-style: italic; font-weight: 600;">Missing</td>
                            <td style="text-align: center;">
                                <button class="btn btn-upload-missing-slot" data-prefix="${prefix}" style="padding: 3px 12px; font-size: 0.72rem; font-weight: 700; background: #dc2626; color: #ffffff; border: none; border-radius: 6px; display: inline-flex; align-items: center; gap: 5px; cursor: pointer; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.25);">
                                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                    ➕ Upload File
                                </button>
                            </td>
                        </tr>
                    `;
                }
            }

            subTableHtml += `</tbody></table>`;
            subContainer.innerHTML = subTableHtml;

            // Attach event listeners for sub-table items
            subContainer.querySelectorAll('.btn-copy-fld-file').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const origIdx = parseInt(btn.getAttribute('data-orig-idx'), 10);
                    const fileData = fldUploadedFiles[origIdx];
                    if (fileData) {
                        openCopyFileToFoldersModal(fileData, prefix);
                    }
                });
            });

            subContainer.querySelectorAll('.btn-edit-fld-file').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const origIdx = parseInt(btn.getAttribute('data-orig-idx'), 10);
                    const fileData = fldUploadedFiles[origIdx];
                    if (fileData) {
                        openEditFldFileNameModal(fileData);
                    }
                });
            });

            subContainer.querySelectorAll('.btn-inspect-fld-file').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const origIdx = parseInt(btn.getAttribute('data-orig-idx'), 10);
                    const fileData = fldUploadedFiles[origIdx];
                    if (fileData) {
                        inspectFldFile(fileData);
                    }
                });
            });

            subContainer.querySelectorAll('.btn-del-fld-file').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const origIdx = parseInt(btn.getAttribute('data-orig-idx'), 10);
                    const fileName = btn.getAttribute('data-filename');
                    showDeleteConfirmation({
                        title: `Delete File?`,
                        message: `Are you sure you want to remove "${fileName}" from folder "${prefix}"?`,
                        onConfirm: () => removeFldFile(origIdx)
                    });
                });
            });

            const btnAddSubFile = subContainer.querySelector('.btn-add-sub-file');
            if (btnAddSubFile) {
                btnAddSubFile.addEventListener('click', (e) => {
                    e.stopPropagation();
                    addManualFileToFolder(prefix);
                });
            }

            // Click listener on missing slot rows and upload buttons
            subContainer.querySelectorAll('.fld-missing-slot-row, .btn-upload-missing-slot').forEach(el => {
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const targetPrefix = el.getAttribute('data-prefix');
                    if (targetPrefix) {
                        addManualFileToFolder(targetPrefix);
                    }
                });
            });

            tdSub.appendChild(subContainer);
            trSub.appendChild(tdSub);
            tbodyElement.appendChild(trSub);
        }
    });
}

// Remove an individual file from folder list
function removeFldFile(index) {
    if (index >= 0 && index < fldUploadedFiles.length) {
        const removed = fldUploadedFiles.splice(index, 1)[0];
        updateFldSelectedUI();
        recalculateFldGroupsAndPreview();
        showToast(`Removed "${removed.name}".`, "info");
    }
}

// Remove an entire folder group
function removeFldFolder(prefix) {
    const prevCount = fldUploadedFiles.length;
    if (fldMode === 'files') {
        fldUploadedFiles = fldUploadedFiles.filter(f => {
            const name = f.name;
            const p = name.includes("-") ? name.split("-")[0].trim() : "Ungrouped";
            return p !== prefix;
        });
    } else {
        fldUploadedFiles = fldUploadedFiles.filter(f => (f.folderName || "Ungrouped") !== prefix);
    }
    fldExpandedFolders.delete(prefix);
    const removedCount = prevCount - fldUploadedFiles.length;
    updateFldSelectedUI();
    recalculateFldGroupsAndPreview();
    showToast(`Deleted folder "${prefix}" (${removedCount} file(s)).`, "info");
}

// Manual file upload into a specific folder
function addManualFileToFolder(folderPrefix) {
    fldActiveManualTargetFolder = folderPrefix;
    const manualInput = document.getElementById('fld-manual-file-input');
    if (manualInput) {
        manualInput.value = '';
        manualInput.click();
    }
}

// Inspect a folder file
async function inspectFldFile(fileData) {
    if (!fileData || !fileData.fileObj) return;
    try {
        const aoa = await readExcelAsAOA(fileData.fileObj);
        openRenFileInspector({
            name: fileData.name,
            parsedAOA: aoa.slice(0, 50),
            fileObj: fileData.fileObj
        });
    } catch (err) {
        console.error(err);
        showToast("Failed to preview file: " + err.message, "error");
    }
}

// Setup Folder Create event listeners
function setupFolderCreate() {
    const fldDropzone = document.getElementById('fld-dropzone');
    const fldFileInput = document.getElementById('fld-file-input');
    const fldFolderInput = document.getElementById('fld-folder-input');
    const fldManualInput = document.getElementById('fld-manual-file-input');
    const btnFldSelectFiles = document.getElementById('btn-fld-select-files');
    const btnFldRun = document.getElementById('btn-fld-run');
    const btnFldClear = document.getElementById('btn-fld-clear');

    const fldModeFilesBtn = document.getElementById('fld-mode-files-btn');
    const fldModeFoldersBtn = document.getElementById('fld-mode-folders-btn');

    const btnFldFullview = document.getElementById('btn-fld-fullview');
    const btnFldDownloadErrorExcel = document.getElementById('btn-fld-download-error-excel');
    const btnFldMoveToProcessor = document.getElementById('btn-fld-move-to-processor');
    const btnFldDownloadZip = document.getElementById('btn-fld-download-zip');

    if (fldModeFilesBtn) {
        fldModeFilesBtn.addEventListener('click', () => switchFldMode('files'));
    }
    if (fldModeFoldersBtn) {
        fldModeFoldersBtn.addEventListener('click', () => switchFldMode('folders'));
    }

    if (btnFldClear) {
        btnFldClear.addEventListener('click', () => {
            fldUploadedFiles = [];
            fldExpandedFolders.clear();
            if (fldFileInput) fldFileInput.value = '';
            if (fldFolderInput) fldFolderInput.value = '';
            resetFolderCreateButtonState();
            updateFldSelectedUI();
            recalculateFldGroupsAndPreview();
            clearFolderCreateSessionStorage();
            showToast("Cleared selected files list", "success");
        });
    }

    if (btnFldSelectFiles) {
        btnFldSelectFiles.addEventListener('click', (e) => {
            e.stopPropagation();
            if (fldMode === 'files') {
                fldFileInput.click();
            } else {
                if (fldFolderInput) fldFolderInput.click();
            }
        });
    }

    if (fldDropzone) {
        fldDropzone.addEventListener('click', (e) => {
            if (e.target.closest('#btn-fld-select-files')) return;
            if (fldMode === 'files') {
                fldFileInput.click();
            } else {
                if (fldFolderInput) fldFolderInput.click();
            }
        });

        fldDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            fldDropzone.classList.add('dragover');
        });

        fldDropzone.addEventListener('dragleave', () => {
            fldDropzone.classList.remove('dragover');
        });

        fldDropzone.addEventListener('drop', async (e) => {
            e.preventDefault();
            fldDropzone.classList.remove('dragover');
            let files = [];
            if (fldMode === 'files') {
                if (e.dataTransfer.files.length > 0) {
                    files = Array.from(e.dataTransfer.files);
                }
            } else {
                files = await getFilesFromDataTransfer(e.dataTransfer);
            }
            if (files.length > 0) {
                handleFldFileSelection(files);
            }
        });
    }

    if (fldFileInput) {
        fldFileInput.addEventListener('change', (e) => {
            handleFldFileSelection(e.target.files);
        });
    }

    if (fldFolderInput) {
        fldFolderInput.addEventListener('change', (e) => {
            handleFldFileSelection(e.target.files);
        });
    }

    // Manual file input for adding directly into a specific folder
    if (fldManualInput) {
        fldManualInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0 && fldActiveManualTargetFolder) {
                const targetPrefix = fldActiveManualTargetFolder;
                Array.from(e.target.files).forEach(file => {
                    const ext = file.name.split('.').pop().toLowerCase();
                    let finalName = file.name;
                    if (!finalName.startsWith(targetPrefix + "-")) {
                        finalName = `${targetPrefix}-${file.name}`;
                    }
                    fldUploadedFiles.push({
                        name: finalName,
                        ext: ext,
                        folderName: targetPrefix,
                        relativePath: `${targetPrefix}/${finalName}`,
                        fileObj: file
                    });
                });
                fldExpandedFolders.add(targetPrefix);
                updateFldSelectedUI();
                recalculateFldGroupsAndPreview();
                showToast(`Added file(s) into folder "${targetPrefix}".`, "success");
                fldActiveManualTargetFolder = null;
            }
        });
    }

    // Header buttons
    if (btnFldFullview) btnFldFullview.addEventListener('click', openFldFullViewModal);
    if (btnFldDownloadErrorExcel) btnFldDownloadErrorExcel.addEventListener('click', downloadFldErrorExcel);
    if (btnFldMoveToProcessor) btnFldMoveToProcessor.addEventListener('click', moveFolderCreateToProcessor);
    if (btnFldDownloadZip) btnFldDownloadZip.addEventListener('click', runFolderCreateProcess);
    if (btnFldRun) btnFldRun.addEventListener('click', runFolderCreateProcess);

    // Setup Copy Modal controls
    setupCopyFileToFoldersModal();

    // Setup Edit Modal controls
    setupEditFldFileModal();

    // Setup Full View Modal controls
    setupFldFullViewModal();

    // Restore 1-hour session from IndexedDB if available
    loadFolderCreateSessionFromStorage();
}

// ----------------------------------------------------
// COPY / PASTE FILE TO TARGET FOLDERS MODAL
// ----------------------------------------------------

function setupCopyFileToFoldersModal() {
    const modal = document.getElementById('copy-file-to-folders-modal');
    const btnClose = document.getElementById('btn-close-copy-modal');
    const btnCancel = document.getElementById('btn-cancel-copy-modal');
    const btnConfirm = document.getElementById('btn-confirm-copy-paste');
    const searchInput = document.getElementById('copy-folders-search');

    const btnSelectMissing = document.getElementById('btn-copy-select-missing');
    const btnSelectAll = document.getElementById('btn-copy-select-all');
    const btnDeselectAll = document.getElementById('btn-copy-deselect-all');

    if (btnClose) btnClose.addEventListener('click', closeCopyFileToFoldersModal);
    if (btnCancel) btnCancel.addEventListener('click', closeCopyFileToFoldersModal);
    if (btnConfirm) btnConfirm.addEventListener('click', confirmCopyPasteFiles);

    if (searchInput) {
        searchInput.addEventListener('input', renderCopyTargetFoldersList);
    }

    if (btnSelectMissing) {
        btnSelectMissing.addEventListener('click', () => {
            const list = document.getElementById('copy-target-folders-list');
            if (list) {
                list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    const isMissing = cb.getAttribute('data-is-missing') === 'true';
                    cb.checked = isMissing;
                });
            }
        });
    }

    if (btnSelectAll) {
        btnSelectAll.addEventListener('click', () => {
            const list = document.getElementById('copy-target-folders-list');
            if (list) {
                list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.checked = true;
                });
            }
        });
    }

    if (btnDeselectAll) {
        btnDeselectAll.addEventListener('click', () => {
            const list = document.getElementById('copy-target-folders-list');
            if (list) {
                list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.checked = false;
                });
            }
        });
    }
}

function openCopyFileToFoldersModal(sourceFile, sourcePrefix) {
    fldActiveCopyFile = {
        fileObj: sourceFile.fileObj,
        name: sourceFile.name,
        folderPrefix: sourcePrefix
    };

    const modal = document.getElementById('copy-file-to-folders-modal');
    const display = document.getElementById('copy-source-file-display');
    const searchInput = document.getElementById('copy-folders-search');

    if (!modal) return;
    if (display) {
        display.textContent = `📄 ${sourceFile.name} (from Folder "${sourcePrefix}")`;
    }
    if (searchInput) searchInput.value = '';

    renderCopyTargetFoldersList();
    modal.classList.add('show');
    modal.classList.remove('hidden');
}

function closeCopyFileToFoldersModal() {
    const modal = document.getElementById('copy-file-to-folders-modal');
    if (modal) {
        modal.classList.remove('show');
        modal.classList.add('hidden');
    }
    fldActiveCopyFile = null;
}

function renderCopyTargetFoldersList() {
    const container = document.getElementById('copy-target-folders-list');
    const searchInput = document.getElementById('copy-folders-search');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    if (!container || !fldActiveCopyFile) return;
    container.innerHTML = '';

    const groups = getFldPrefixGroups();
    const sortedPrefixes = getSortedFldPrefixes(groups, true);

    const currentPrefix = fldActiveCopyFile.folderPrefix;

    // Filter target folders: ONLY missing / error folders (count < 3) and exclude source folder
    let targetPrefixes = sortedPrefixes.filter(p => {
        if (p === currentPrefix) return false;
        const filesInGroup = groups.get(p) || [];
        return filesInGroup.length < 3; // ONLY missing / error folders!
    });

    if (query) {
        targetPrefixes = targetPrefixes.filter(p => p.toLowerCase().includes(query));
    }

    if (targetPrefixes.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: #10b981; padding: 1.2rem; font-size: 0.78rem; font-weight: 600;">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.2" fill="none" style="display: block; margin: 0 auto 0.35rem auto;"><polyline points="20 6 9 17 4 12"></polyline></svg>
            No missing folders found! All other folders are already complete (3+ files).
        </div>`;
        return;
    }

    targetPrefixes.forEach(prefix => {
        const filesInGroup = groups.get(prefix) || [];
        const count = filesInGroup.length;
        const missingCount = 3 - count;

        const row = document.createElement('label');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.padding = '0.4rem 0.6rem';
        row.style.borderRadius = '6px';
        row.style.background = 'rgba(239, 68, 68, 0.04)';
        row.style.border = '1px solid rgba(239, 68, 68, 0.2)';
        row.style.cursor = 'pointer';

        row.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" value="${prefix}" data-is-missing="true" style="accent-color: var(--primary); cursor: pointer; width: 15px; height: 15px;">
                <span style="font-family: monospace; font-weight: 700; font-size: 0.8rem; color: var(--text-primary);">📁 ${prefix}</span>
            </div>
            <div>
                <span class="badge danger" style="font-size: 0.68rem; background: rgba(239, 68, 68, 0.15); color: #ef4444; font-weight: 700; padding: 2px 7px; border-radius: 4px;">
                    ⚠️ ${count} files (${missingCount} missing)
                </span>
            </div>
        `;
        container.appendChild(row);
    });
}

function confirmCopyPasteFiles() {
    if (!fldActiveCopyFile) return;

    const list = document.getElementById('copy-target-folders-list');
    const autoPrefixCheckbox = document.getElementById('copy-auto-prefix-checkbox');
    const autoPrefix = autoPrefixCheckbox ? autoPrefixCheckbox.checked : true;

    if (!list) return;

    const selectedPrefixes = [];
    list.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
        selectedPrefixes.push(cb.value);
    });

    if (selectedPrefixes.length === 0) {
        showToast("Please select at least one target folder.", "warning");
        return;
    }

    const sourceName = fldActiveCopyFile.name;
    const sourcePrefix = fldActiveCopyFile.folderPrefix;
    const sourceBlob = fldActiveCopyFile.fileObj;
    const ext = sourceName.split('.').pop().toLowerCase();

    let pastedCount = 0;

    selectedPrefixes.forEach(targetPrefix => {
        let newName = sourceName;
        if (autoPrefix) {
            if (sourceName.startsWith(sourcePrefix + "-")) {
                newName = `${targetPrefix}-${sourceName.substring(sourcePrefix.length + 1)}`;
            } else if (sourceName.includes("-")) {
                const parts = sourceName.split("-");
                parts[0] = targetPrefix;
                newName = parts.join("-");
            } else {
                newName = `${targetPrefix}-${sourceName}`;
            }
        }

        // Avoid exact duplicate
        const exists = fldUploadedFiles.some(f => f.name === newName && (f.folderName === targetPrefix || f.name.startsWith(targetPrefix + "-")));
        if (!exists) {
            fldUploadedFiles.push({
                name: newName,
                ext: ext,
                folderName: targetPrefix,
                relativePath: `${targetPrefix}/${newName}`,
                fileObj: sourceBlob
            });
            fldExpandedFolders.add(targetPrefix);
            pastedCount++;
        }
    });

    closeCopyFileToFoldersModal();
    updateFldSelectedUI();
    recalculateFldGroupsAndPreview();

    showToast(`Pasted file into ${pastedCount} folder(s) successfully!`, "success");
}

// ----------------------------------------------------
// EDIT FOLDER FILE NAME MODAL
// ----------------------------------------------------

function setupEditFldFileModal() {
    const modal = document.getElementById('edit-fld-file-modal');
    const btnClose = document.getElementById('btn-close-edit-fld-file');
    const btnCancel = document.getElementById('btn-cancel-edit-fld-file');
    const btnSave = document.getElementById('btn-save-edit-fld-file');

    if (btnClose) btnClose.addEventListener('click', closeEditFldFileModal);
    if (btnCancel) btnCancel.addEventListener('click', closeEditFldFileModal);
    if (btnSave) btnSave.addEventListener('click', saveEditFldFileName);
}

function openEditFldFileNameModal(fileData) {
    fldActiveEditFile = fileData;
    const modal = document.getElementById('edit-fld-file-modal');
    const currentDisplay = document.getElementById('edit-fld-file-current');
    const input = document.getElementById('edit-fld-file-input');

    if (!modal) return;
    if (currentDisplay) currentDisplay.textContent = fileData.name;
    if (input) input.value = fileData.name;

    modal.classList.add('show');
    modal.classList.remove('hidden');
    if (input) input.focus();
}

function closeEditFldFileModal() {
    const modal = document.getElementById('edit-fld-file-modal');
    if (modal) {
        modal.classList.remove('show');
        modal.classList.add('hidden');
    }
    fldActiveEditFile = null;
}

function saveEditFldFileName() {
    if (!fldActiveEditFile) return;
    const input = document.getElementById('edit-fld-file-input');
    const newName = input ? input.value.trim() : '';

    if (!newName) {
        showToast("Please enter a valid file name.", "warning");
        return;
    }

    fldActiveEditFile.name = newName;
    if (fldActiveEditFile.folderName) {
        fldActiveEditFile.relativePath = `${fldActiveEditFile.folderName}/${newName}`;
    }

    closeEditFldFileModal();
    updateFldSelectedUI();
    recalculateFldGroupsAndPreview();
    showToast(`File name updated to "${newName}".`, "success");
}

// ----------------------------------------------------
// FULL VIEW MODAL FOR FOLDER CREATE
// ----------------------------------------------------

function setupFldFullViewModal() {
    const btnClose = document.getElementById('btn-close-fld-fullview');
    const searchInput = document.getElementById('fld-fullview-search');

    if (btnClose) btnClose.addEventListener('click', closeFldFullViewModal);
    if (searchInput) searchInput.addEventListener('input', renderFldFullViewModalRows);

    document.querySelectorAll('.fld-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.fld-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            fldFullViewFilter = btn.getAttribute('data-filter') || 'all';
            renderFldFullViewModalRows();
        });
    });
}

function openFldFullViewModal() {
    const modal = document.getElementById('fld-fullview-modal');
    const searchInput = document.getElementById('fld-fullview-search');

    if (!modal) return;
    if (searchInput) searchInput.value = '';

    renderFldFullViewModalRows();
    modal.classList.add('show');
    modal.classList.remove('hidden');
}

function closeFldFullViewModal() {
    const modal = document.getElementById('fld-fullview-modal');
    if (modal) {
        modal.classList.remove('show');
        modal.classList.add('hidden');
    }
}

function renderFldFullViewModalRows() {
    const tbody = document.getElementById('tbody-fld-fullview-files');
    const countTag = document.getElementById('fld-fullview-count');
    const searchInput = document.getElementById('fld-fullview-search');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    if (!tbody) return;

    const groups = getFldPrefixGroups();
    const sortedPrefixes = getSortedFldPrefixes(groups, true); // Missing/Error folders always on top

    if (countTag) {
        countTag.textContent = `${sortedPrefixes.length} folders loaded`;
    }

    renderFldAccordionTable(tbody, sortedPrefixes, groups, true, query, fldFullViewFilter);
}

// ----------------------------------------------------
// DOWNLOAD ERROR EXCEL REPORT
// ----------------------------------------------------

function downloadFldErrorExcel() {
    if (fldUploadedFiles.length === 0) {
        showToast("No files or folders available to generate report.", "error");
        return;
    }

    const groups = getFldPrefixGroups();
    const sortedPrefixes = getSortedFldPrefixes(groups, true); // Missing/Error folders first

    const reportAOA = [
        ["MYNTRA FOLDER CREATION & ERROR REPORT"],
        ["#", "Folder Name (Prefix)", "Current Files Count", "Missing Files Needed", "Status", "Files List"]
    ];

    let errorCount = 0;
    sortedPrefixes.forEach((prefix, idx) => {
        const filesInGroup = groups.get(prefix) || [];
        const count = filesInGroup.length;
        const isComplete = count >= 3;
        const missingCount = isComplete ? 0 : (3 - count);
        const status = isComplete ? "Complete (3+ Files)" : `ERROR: Missing ${missingCount} File(s)`;
        const filesStr = filesInGroup.map(f => f.name).join("; ");

        if (!isComplete) errorCount++;

        reportAOA.push([
            idx + 1,
            prefix,
            count,
            missingCount,
            status,
            filesStr
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(reportAOA);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
    ws['!cols'] = [
        { wch: 6 },
        { wch: 22 },
        { wch: 18 },
        { wch: 20 },
        { wch: 24 },
        { wch: 60 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Folder_Error_Report");
    XLSX.writeFile(wb, `Myntra_Folder_Error_Report_${getDtStamp()}.xlsx`);

    showToast(`Error Report Excel downloaded (${errorCount} error folders found).`, "success");
}

// ----------------------------------------------------
// MOVE TO FILE RENAMER & PROCESSOR TAB
// ----------------------------------------------------

async function moveFolderCreateToProcessor() {
    if (fldUploadedFiles.length === 0) {
        showToast("No folder files to move to processor.", "error");
        return;
    }

    const fldProgress = document.getElementById('fld-progress');
    const fldProgressPercent = document.getElementById('fld-progress-percent');
    const fldProgressText = document.getElementById('fld-progress-text');
    const fldProgressFill = document.getElementById('fld-progress-fill');

    if (fldProgress) fldProgress.classList.remove('hidden');
    const updateProgress = (pct, txt) => {
        if (fldProgressPercent) fldProgressPercent.textContent = `${Math.round(pct)}%`;
        if (fldProgressFill) fldProgressFill.style.width = `${pct}%`;
        if (fldProgressText) fldProgressText.textContent = txt;
    };

    updateProgress(15, "Packaging all folder files for File Renamer & Processor...");
    await new Promise(r => setTimeout(r, 40));

    try {
        const groups = getFldPrefixGroups();
        const sortedPrefixes = Array.from(groups.keys()).filter(p => p && p !== 'Other').sort((a, b) => {
            const numA = parseInt(a, 10);
            const numB = parseInt(b, 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });
        const zip = new JSZip();

        let processed = 0;
        const total = fldUploadedFiles.length;

        for (const prefix of sortedPrefixes) {
            const filesInGroup = groups.get(prefix) || [];
            for (const fileObj of filesInGroup) {
                processed++;
                const pct = 15 + Math.round((processed / total) * 75);
                updateProgress(pct, `Packing: ${fileObj.name}...`);
                await new Promise(r => setTimeout(r, 5));

                zip.file(`${prefix}/${fileObj.name}`, fileObj.fileObj);
            }
        }

        // Also pack any "Other" non-prefix files if present
        const otherFiles = groups.get('Other') || [];
        for (const fileObj of otherFiles) {
            processed++;
            zip.file(fileObj.name, fileObj.fileObj);
        }

        updateProgress(95, "Finalizing package...");
        await new Promise(r => setTimeout(r, 40));

        let dynamicZipName = "myntra_folder_bundle.zip";
        if (sortedPrefixes.length === 1) {
            dynamicZipName = `${sortedPrefixes[0]}.zip`;
        } else if (sortedPrefixes.length > 1) {
            dynamicZipName = `${sortedPrefixes[0]}-${sortedPrefixes[sortedPrefixes.length - 1]}.zip`;
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipFile = new File([zipBlob], dynamicZipName, { type: "application/zip" });

        updateProgress(100, "Done!");
        setTimeout(() => {
            if (fldProgress) fldProgress.classList.add('hidden');
        }, 800);

        // Send to processor tab
        await handleUploadedFiles([zipFile]);

        // Switch to File Renamer & Processor Tab
        const processorTabBtn = document.getElementById('btn-processor-tab') || document.querySelector('.tab-btn[data-tab="tab-processor"]');
        if (processorTabBtn) processorTabBtn.click();

        showToast(`Transferred all ${total} files across ${sortedPrefixes.length} folders to File Renamer & Processor!`, "success");

    } catch (err) {
        console.error(err);
        if (fldProgress) fldProgress.classList.add('hidden');
        showToast("Error moving to processor: " + err.message, "error");
    }
}

function resetFolderCreateButtonState() {
    fldGeneratedZipBlob = null;
    fldGeneratedZipName = "";
    
    const btnFldRun = document.getElementById('btn-fld-run');
    if (btnFldRun) {
        btnFldRun.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
            Create Folders & Zip
        `;
        btnFldRun.style.background = "";
        btnFldRun.style.borderColor = "";
        btnFldRun.disabled = false;
    }
    
    const fldFileLabel = document.getElementById('fld-file-label');
    if (fldFileLabel) {
        if (fldMode === 'files') {
            fldFileLabel.textContent = "Drag & Drop files here";
        } else {
            fldFileLabel.textContent = "Drag & Drop folders here";
        }
    }
}

async function handleFldFileSelection(files) {
    resetFolderCreateButtonState();
    if (!files || files.length === 0) return;
    
    const fldProgress = document.getElementById('fld-progress');
    const fldProgressPercent = document.getElementById('fld-progress-percent');
    const fldProgressText = document.getElementById('fld-progress-text');
    const fldProgressFill = document.getElementById('fld-progress-fill');
    
    if (fldProgress) fldProgress.classList.remove('hidden');
    const updateFldProgress = (percent, text) => {
        if (fldProgressPercent) fldProgressPercent.textContent = `${Math.round(percent)}%`;
        if (fldProgressFill) fldProgressFill.style.width = `${percent}%`;
        if (fldProgressText && text) fldProgressText.textContent = text;
    };
    
    updateFldProgress(10, "Reading files...");
    
    try {
        const flatFilesList = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const ext = file.name.split('.').pop().toLowerCase();
            
            const isSystemFile = file.name.startsWith('.') || file.name.startsWith('~') || file.name === "Thumbs.db";
            if (isSystemFile) continue;
            
            if (ext === 'zip' && fldMode === 'files') {
                updateFldProgress(10 + Math.round((i / files.length) * 40), `Extracting ZIP: ${file.name}...`);
                const extracted = await extractSpreadsheetsFromZip(file);
                flatFilesList.push(...extracted);
            } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
                flatFilesList.push({
                    name: file.name,
                    ext: ext,
                    blob: file,
                    customRelativePath: file.customRelativePath || file.webkitRelativePath || file.name
                });
            }
        }
        
        if (flatFilesList.length === 0) {
            if (fldProgress) fldProgress.classList.add('hidden');
            showToast("No valid Excel or CSV files found.", "error");
            return;
        }
        
        let addedCount = 0;
        flatFilesList.forEach(fileData => {
            if (fldMode === 'files') {
                if (!fldUploadedFiles.some(f => f.name === fileData.name && f.fileObj.size === fileData.blob.size)) {
                    fldUploadedFiles.push({
                        name: fileData.name,
                        ext: fileData.ext,
                        fileObj: fileData.blob
                    });
                    addedCount++;
                }
            } else {
                const relativePath = fileData.customRelativePath || fileData.name;
                const normalizedPath = relativePath.replace(/\\/g, '/');
                const pathParts = normalizedPath.split('/');
                
                if (pathParts.length > 1) {
                    const folderName = pathParts[pathParts.length - 2];
                    const cleanRelativePath = `${folderName}/${fileData.name}`;
                    
                    if (!fldUploadedFiles.some(f => f.relativePath === cleanRelativePath && f.fileObj.size === fileData.blob.size)) {
                        fldUploadedFiles.push({
                            name: fileData.name,
                            ext: fileData.ext,
                            fileObj: fileData.blob,
                            folderName: folderName,
                            relativePath: cleanRelativePath
                        });
                        addedCount++;
                    }
                } else {
                    console.warn(`Ignored file [${fileData.name}] because it is not inside an uploaded folder.`);
                }
            }
        });
        
        if (addedCount > 0) {
            showToast(`Added ${addedCount} file(s) to process.`, "success");
        } else {
            showToast("No new files added.", "warning");
        }
        
        updateFldSelectedUI();
        recalculateFldGroupsAndPreview();
        
        updateFldProgress(100, "Files loaded and analyzed.");
        setTimeout(() => {
            if (fldProgress) fldProgress.classList.add('hidden');
        }, 1000);
        
    } catch (err) {
        console.error(err);
        showToast("Error processing files: " + err.message, "error");
        if (fldProgress) fldProgress.classList.add('hidden');
    }
}

async function runFolderCreateProcess() {
    if (fldUploadedFiles.length === 0) {
        showToast("No files loaded. Please upload files first.", "error");
        return;
    }
    
    const btnFldRun = document.getElementById('btn-fld-run');
    if (fldGeneratedZipBlob) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(fldGeneratedZipBlob);
        a.download = fldGeneratedZipName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast("Downloaded folders ZIP successfully!", "success");
        return;
    }
    
    const fldProgress = document.getElementById('fld-progress');
    const fldProgressPercent = document.getElementById('fld-progress-percent');
    const fldProgressText = document.getElementById('fld-progress-text');
    const fldProgressFill = document.getElementById('fld-progress-fill');
    
    if (fldProgress) fldProgress.classList.remove('hidden');
    const updateFldProgress = (percent, text) => {
        if (fldProgressPercent) fldProgressPercent.textContent = `${Math.round(percent)}%`;
        if (fldProgressFill) fldProgressFill.style.width = `${percent}%`;
        if (fldProgressText && text) fldProgressText.textContent = text;
    };
    
    try {
        if (btnFldRun) btnFldRun.disabled = true;
        updateFldProgress(10, "Grouping files...");
        await new Promise(r => setTimeout(r, 200));
        
        const groups = getFldPrefixGroups();
        
        if (groups.size === 0) {
            showToast("No files could be grouped.", "error");
            if (fldProgress) fldProgress.classList.add('hidden');
            if (btnFldRun) btnFldRun.disabled = false;
            return;
        }
        
        const sortedPrefixes = Array.from(groups.keys()).sort();
        const firstPrefix = sortedPrefixes[0];
        const lastPrefix = sortedPrefixes[sortedPrefixes.length - 1];
        
        updateFldProgress(30, "Creating summary report sheets...");
        await new Promise(r => setTimeout(r, 200));
        
        const summaryAOA = [
            ["Folder Creation & Completeness Report"],
            ["Folder Name", "Current File Count", "Missing Files Count", "Status"]
        ];
        
        sortedPrefixes.forEach(prefix => {
            const filesInGroup = groups.get(prefix);
            const count = filesInGroup.length;
            const missingCount = count < 3 ? (3 - count) : 0;
            const status = count >= 3 ? "Complete" : `Missing ${missingCount} File(s)`;
            summaryAOA.push([prefix, count, missingCount, status]);
        });
        
        const summaryWS = XLSX.utils.aoa_to_sheet(summaryAOA);
        summaryWS['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
        summaryWS['!cols'] = [
            { wch: 25 },
            { wch: 20 },
            { wch: 20 },
            { wch: 22 }
        ];
        
        const summaryWB = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(summaryWB, summaryWS, "Folder_Summary");
        const summaryBuffer = XLSX.write(summaryWB, { bookType: 'xlsx', type: 'array' });
        const summaryBlob = new Blob([summaryBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        updateFldProgress(50, "Generating ZIP archive...");
        await new Promise(r => setTimeout(r, 200));
        
        const zip = new JSZip();
        zip.file("Folder_Summary.xlsx", summaryBlob);
        
        sortedPrefixes.forEach(prefix => {
            const filesInGroup = groups.get(prefix);
            filesInGroup.forEach(fileObj => {
                if (fldMode === 'files') {
                    zip.file(`${prefix}/${fileObj.name}`, fileObj.fileObj);
                } else {
                    zip.file(fileObj.relativePath || `${prefix}/${fileObj.name}`, fileObj.fileObj);
                }
            });
        });
        
        updateFldProgress(80, "Compiling final ZIP file...");
        await new Promise(r => setTimeout(r, 200));
        
        const zipBlob = await zip.generateAsync({ type: "blob" });
        
        fldGeneratedZipBlob = zipBlob;
        fldGeneratedZipName = `${firstPrefix}-${lastPrefix}.zip`;
        
        updateFldProgress(100, "Success!");
        showToast(`ZIP created successfully with ${groups.size} folders!`, "success");
        
        if (btnFldRun) {
            btnFldRun.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Download ZIP
            `;
            btnFldRun.style.background = "var(--color-od)";
            btnFldRun.style.borderColor = "var(--color-od)";
            btnFldRun.disabled = false;
        }
        
    } catch (err) {
        console.error(err);
        showToast("Error creating folders and ZIP: " + err.message, "error");
        if (btnFldRun) btnFldRun.disabled = false;
        if (fldProgress) fldProgress.classList.add('hidden');
    }
}

// ==========================
// INVOICE ERROR TAB LOGIC
// ==========================

function setupInvoiceError() {
    const invDropzone = document.getElementById('inv-dropzone');
    const invFileInput = document.getElementById('inv-file-input');
    const btnInvSelectFiles = document.getElementById('btn-inv-select-files');
    const btnInvRun = document.getElementById('btn-inv-run');
    
    if (!invDropzone || !invFileInput || !btnInvRun) return;
    
    // Select Files click trigger
    if (btnInvSelectFiles) {
        btnInvSelectFiles.addEventListener('click', (e) => {
            e.stopPropagation();
            invFileInput.click();
        });
    }
    
    invDropzone.addEventListener('click', () => {
        invFileInput.click();
    });
    
    invFileInput.addEventListener('change', (e) => {
        handleInvFileSelection(e.target.files);
    });
    
    // Drag & Drop
    invDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        invDropzone.classList.add('dragover');
    });
    
    invDropzone.addEventListener('dragleave', () => {
        invDropzone.classList.remove('dragover');
    });
    
    invDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        invDropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleInvFileSelection(e.dataTransfer.files);
        }
    });
    
    // Run process
    btnInvRun.addEventListener('click', runInvoiceErrorProcess);
}

function resetInvoiceErrorButtonState() {
    invGeneratedZipBlob = null;
    invGeneratedZipName = "";
    
    const btnInvRun = document.getElementById('btn-inv-run');
    if (btnInvRun) {
        btnInvRun.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            Process Invoice Errors
        `;
        btnInvRun.style.background = ""; // Restore default style
        btnInvRun.style.borderColor = "";
        btnInvRun.disabled = false;
    }
    
    const invFileLabel = document.getElementById('inv-file-label');
    if (invFileLabel) {
        invFileLabel.textContent = "Drag & Drop invoice files here";
    }
}

async function handleInvFileSelection(files) {
    resetInvoiceErrorButtonState();
    if (!files || files.length === 0) return;
    
    const invProgress = document.getElementById('inv-progress');
    const invProgressPercent = document.getElementById('inv-progress-percent');
    const invProgressText = document.getElementById('inv-progress-text');
    const invProgressFill = document.getElementById('inv-progress-fill');
    const invEmptyState = document.getElementById('inv-empty-state');
    const invTableContainer = document.getElementById('inv-table-container');
    const invPreviewTbody = document.getElementById('inv-preview-tbody');
    const invFileCount = document.getElementById('inv-file-count');
    const btnInvRun = document.getElementById('btn-inv-run');
    const invFileLabel = document.getElementById('inv-file-label');
    
    invProgress.classList.remove('hidden');
    const updateInvProgress = (percent, text) => {
        invProgressPercent.textContent = `${Math.round(percent)}%`;
        invProgressFill.style.width = `${percent}%`;
        if (text) invProgressText.textContent = text;
    };
    
    updateInvProgress(5, "Reading uploaded invoice files...");
    invUploadedFiles = [];
    
    try {
        const flatFilesList = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const ext = file.name.split('.').pop().toLowerCase();
            
            if (ext === 'zip') {
                updateInvProgress(10 + Math.round((i / files.length) * 40), `Extracting ZIP: ${file.name}...`);
                const extracted = await extractSpreadsheetsFromZip(file);
                flatFilesList.push(...extracted);
            } else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
                flatFilesList.push({
                    name: file.name,
                    ext: ext,
                    blob: file
                });
            }
        }
        
        if (flatFilesList.length === 0) {
            invProgress.classList.add('hidden');
            showToast("No valid Excel or CSV files found.", "error");
            return;
        }
        
        if (invFileLabel) {
            invFileLabel.textContent = `${flatFilesList.length} files loaded`;
        }
        if (invFileCount) {
            invFileCount.textContent = `${flatFilesList.length} files loaded`;
        }
        
        // Save to invUploadedFiles
        flatFilesList.forEach(f => {
            invUploadedFiles.push({
                name: f.name,
                ext: f.ext,
                fileObj: f.blob
            });
        });
        
        updateInvProgress(50, "Analyzing spreadsheet columns...");
        
        // Read the first file to show a preview of errors and parties
        const firstFile = flatFilesList[0];
        const aoa = await readExcelAsAOA(firstFile.blob);
        
        if (aoa.length <= 1) {
            updateInvProgress(100, "Loaded empty sheet.");
            return;
        }
        
        const headerRow = aoa[0];
        const dataRows = aoa.slice(1);
        
        let descColIndex = headerRow.findIndex(cell => String(cell || "").trim().toLowerCase() === 'description');
        let sellerColIndex = headerRow.findIndex(cell => String(cell || "").trim().toLowerCase() === 'seller/customer name');
        
        if (descColIndex === -1) descColIndex = 6;
        if (sellerColIndex === -1) sellerColIndex = 7;
        
        // Count invoice locked rows
        const lockedCount = dataRows.filter(row => String(row[descColIndex] || "").trim().toLowerCase() === "invoice locked").length;
        const cleanedRows = dataRows.filter(row => String(row[descColIndex] || "").trim().toLowerCase() !== "invoice locked");
        
        // Group remaining rows to show preview of what will be generated
        const errorGroups = new Map();
        cleanedRows.forEach(row => {
            const errorVal = String(row[descColIndex] || "").trim();
            let partyVal = String(row[sellerColIndex] || "").trim();
            if (errorVal && !partyVal) {
                partyVal = errorVal;
            }
            
            if (errorVal && partyVal) {
                if (!errorGroups.has(errorVal)) {
                    errorGroups.set(errorVal, new Map());
                }
                const partyMap = errorGroups.get(errorVal);
                if (!partyMap.has(partyVal)) {
                    partyMap.set(partyVal, []);
                }
                partyMap.get(partyVal).push(row);
            }
        });
        
        let html = "";
        let index = 1;
        
        if (lockedCount > 0) {
            html += `
                <tr style="background: rgba(239, 68, 68, 0.05);">
                    <td>-</td>
                    <td style="font-weight: 600; color: #ef4444;">Invoice Locked Rows</td>
                    <td><span class="badge danger" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 2px 8px; border-radius: 4px; font-weight: 500; font-size: 0.7rem;">Will Be Deleted</span></td>
                    <td style="color: #991b1b; font-weight: 500;">${lockedCount} rows flagged for removal.</td>
                </tr>
            `;
        }
        
        for (const [errorType, partyMap] of errorGroups.entries()) {
            for (const [partyName, rows] of partyMap.entries()) {
                const comboName = partyName === errorType ? partyName : `${partyName}-${errorType}`;
                html += `
                    <tr>
                        <td>${index++}</td>
                        <td style="font-weight: 600;">${partyName}</td>
                        <td><span class="badge danger" style="background: rgba(245, 158, 11, 0.15); color: #d97706; padding: 2px 8px; border-radius: 4px; font-weight: 500; font-size: 0.7rem;">${errorType}</span></td>
                        <td>${rows.length} rows. Will create <code>${comboName}.xlsx</code></td>
                    </tr>
                `;
            }
        }
        
        if (invPreviewTbody) {
            invPreviewTbody.innerHTML = html;
        }
        
        invEmptyState.classList.add('hidden');
        invTableContainer.classList.remove('hidden');
        
        updateInvProgress(100, `Loaded: ${firstFile.name}. Found ${errorGroups.size} error groups.`);
        
        if (btnInvRun) {
            btnInvRun.classList.remove('hidden');
        }
        
    } catch (err) {
        console.error(err);
        showToast("Error processing invoice files: " + err.message, "error");
        invProgress.classList.add('hidden');
    }
}

async function runInvoiceErrorProcess() {
    if (invUploadedFiles.length === 0) {
        showToast("No files loaded. Please upload an Excel or CSV file first.", "error");
        return;
    }
    
    const btnInvRun = document.getElementById('btn-inv-run');
    if (invGeneratedZipBlob) {
        // If already generated, this is a download action
        const a = document.createElement("a");
        a.href = URL.createObjectURL(invGeneratedZipBlob);
        a.download = invGeneratedZipName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast("Downloaded Invoice Error package successfully!", "success");
        return;
    }
    
    const invProgress = document.getElementById('inv-progress');
    const invProgressPercent = document.getElementById('inv-progress-percent');
    const invProgressText = document.getElementById('inv-progress-text');
    const invProgressFill = document.getElementById('inv-progress-fill');
    const invPreviewTbody = document.getElementById('inv-preview-tbody');
    
    invProgress.classList.remove('hidden');
    const updateInvProgress = (percent, text) => {
        invProgressPercent.textContent = `${Math.round(percent)}%`;
        invProgressFill.style.width = `${percent}%`;
        if (text) invProgressText.textContent = text;
    };
    
    try {
        btnInvRun.disabled = true;
        updateInvProgress(5, "Reading uploaded file...");
        
        const uploadedFile = invUploadedFiles[0];
        const aoa = await readExcelAsAOA(uploadedFile.fileObj);
        
        if (aoa.length <= 1) {
            showToast("The uploaded file does not contain enough rows to process.", "error");
            btnInvRun.disabled = false;
            invProgress.classList.add('hidden');
            return;
        }
        
        const headerRow = aoa[0];
        const dataRows = aoa.slice(1);
        
        // Find column indices dynamically
        let descColIndex = headerRow.findIndex(cell => String(cell || "").trim().toLowerCase() === 'description');
        let sellerColIndex = headerRow.findIndex(cell => String(cell || "").trim().toLowerCase() === 'seller/customer name');
        
        // Fallbacks
        if (descColIndex === -1) descColIndex = 6; // Column G
        if (sellerColIndex === -1) sellerColIndex = 7; // Column H
        
        updateInvProgress(20, "Filtering out 'Invoice Locked' rows...");
        await new Promise(r => setTimeout(r, 200));
        
        // 1. Delete rows where Column G (Description) is "Invoice Locked"
        const lockedRowsCount = dataRows.filter(row => String(row[descColIndex] || "").trim().toLowerCase() === "invoice locked").length;
        const cleanedDataRows = dataRows.filter(row => String(row[descColIndex] || "").trim().toLowerCase() !== "invoice locked");
        
        // Create Cleaned Original Workbook
        const cleanedAOA = [headerRow, ...cleanedDataRows];
        const cleanedWS = XLSX.utils.aoa_to_sheet(cleanedAOA);
        applyWorksheetFormatting(cleanedWS, cleanedAOA, false);
        const cleanedWB = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(cleanedWB, cleanedWS, "Cleaned_Original");
        const cleanedBuffer = XLSX.write(cleanedWB, { bookType: 'xlsx', type: 'array' });
        const cleanedBlob = new Blob([cleanedBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        updateInvProgress(40, "Grouping errors and party details...");
        await new Promise(r => setTimeout(r, 200));
        
        // Group remaining rows by error type (Column G) and then by Party Name (Column H)
        const errorGroups = new Map();
        
        cleanedDataRows.forEach(row => {
            const errorVal = String(row[descColIndex] || "").trim();
            let partyVal = String(row[sellerColIndex] || "").trim();
            if (errorVal && !partyVal) {
                partyVal = errorVal;
            }
            
            if (errorVal && partyVal) {
                if (!errorGroups.has(errorVal)) {
                    errorGroups.set(errorVal, new Map());
                }
                
                const partyMap = errorGroups.get(errorVal);
                if (!partyMap.has(partyVal)) {
                    partyMap.set(partyVal, []);
                }
                
                partyMap.get(partyVal).push(row);
            }
        });
        
        if (errorGroups.size === 0) {
            showToast("No valid invoice errors found to process.", "warning");
            btnInvRun.disabled = false;
            invProgress.classList.add('hidden');
            return;
        }
        
        const zip = new JSZip();
        
        // Add Cleaned Original file
        const origBaseName = uploadedFile.name.substring(0, uploadedFile.name.lastIndexOf('.')) || uploadedFile.name;
        zip.file(`Cleaned_${origBaseName}.xlsx`, cleanedBlob);
        
        const combinedWb = XLSX.utils.book_new();
        const existingSheetNames = new Set();
        
        // For Summary Excel
        const summaryAOA = [
            ["Invoice Error Summary Report"],
            ["Party Name", "Error Description", "Affected Row Count", "Status"]
        ];
        
        let htmlPreview = "";
        let previewIndex = 1;
        
        updateInvProgress(60, "Generating individual and combined sheets...");
        await new Promise(r => setTimeout(r, 200));
        
        // Loop through errors and parties
        for (const [errorType, partyMap] of errorGroups.entries()) {
            for (const [partyName, rows] of partyMap.entries()) {
                const comboName = partyName === errorType ? partyName : `${partyName}-${errorType}`;
                
                // Form merged Row 1 title and Headers Row 2
                const titleRow = Array(headerRow.length).fill("");
                titleRow[0] = comboName;
                
                const sheetAOA = [titleRow, headerRow, ...rows];
                const ws = XLSX.utils.aoa_to_sheet(sheetAOA);
                
                // Merge Row 1 across all columns
                if (headerRow.length > 1) {
                    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headerRow.length - 1 } }];
                }
                
                // Format worksheet
                applyWorksheetFormatting(ws, sheetAOA, true);
                
                // Create individual workbook
                const groupWb = XLSX.utils.book_new();
                const uniqueSheetName = getUniqueSheetName(comboName, existingSheetNames);
                XLSX.utils.book_append_sheet(groupWb, ws, uniqueSheetName);
                
                const groupBuffer = XLSX.write(groupWb, { bookType: 'xlsx', type: 'array' });
                const groupBlob = new Blob([groupBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                
                // Save directly in the ZIP root
                const groupFilename = `${comboName}.xlsx`;
                zip.file(groupFilename, groupBlob);
                
                // Register tracked error in database
                registerTrackedError('invoice', groupFilename, partyName, errorType, rows.length);
                
                // Append to Combined Workbook
                XLSX.utils.book_append_sheet(combinedWb, ws, uniqueSheetName);
                
                // Append to Summary report data
                summaryAOA.push([partyName, errorType, rows.length, "Failed Check"]);
                
                // Build UI Preview row html
                htmlPreview += `
                    <tr>
                        <td>${previewIndex++}</td>
                        <td style="font-weight: 600;">${partyName}</td>
                        <td><span class="badge danger" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 2px 8px; border-radius: 4px; font-weight: 500; font-size: 0.7rem;">${errorType}</span></td>
                        <td>${rows.length} rows processed. File: <code>${comboName}.xlsx</code></td>
                    </tr>
                `;
            }
        }
        
        updateInvProgress(80, "Creating combined and summary files...");
        await new Promise(r => setTimeout(r, 200));
        
        // Save Combined Workbook
        const combinedBuffer = XLSX.write(combinedWb, { bookType: 'xlsx', type: 'array' });
        const combinedBlob = new Blob([combinedBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        zip.file("Invoice_Error_Combined_Report.xlsx", combinedBlob);
        
        // Create and Save Summary Workbook
        const summaryWS = XLSX.utils.aoa_to_sheet(summaryAOA);
        summaryWS['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
        
        // Style summary workbook
        summaryWS['!views'] = [{ showGridLines: true }];
        summaryWS['!cols'] = [{ wch: 35 }, { wch: 25 }, { wch: 20 }, { wch: 15 }];
        const summaryHeights = [{ hpt: 28 }, { hpt: 24 }];
        for (let r = 2; r < summaryAOA.length; r++) {
            summaryHeights.push({ hpt: 20 });
        }
        summaryWS['!rows'] = summaryHeights;
        
        // Format cells
        for (const cellKey in summaryWS) {
            if (cellKey[0] === '!') continue;
            const cell = summaryWS[cellKey];
            cell.s = {
                border: {
                    top: { style: "thin", color: { rgb: "D1D5DB" } },
                    bottom: { style: "thin", color: { rgb: "D1D5DB" } },
                    left: { style: "thin", color: { rgb: "D1D5DB" } },
                    right: { style: "thin", color: { rgb: "D1D5DB" } }
                }
            };
            
            const match = cellKey.match(/^([A-Z]+)(\d+)$/);
            if (match) {
                const col = match[1];
                const rowNum = parseInt(match[2], 10);
                const colIndex = XLSX.utils.decode_col(col);
                
                if (rowNum === 1) {
                    cell.s.fill = { fgColor: { rgb: "C2410C" } }; // Dark Orange/Red title
                    cell.s.font = { name: "Arial", sz: 12, bold: true, color: { rgb: "FFFFFF" } };
                    cell.s.alignment = { horizontal: "center", vertical: "center" };
                } else if (rowNum === 2) {
                    cell.s.fill = { fgColor: { rgb: "EA580C" } }; // Orange header
                    cell.s.font = { name: "Arial", sz: 10, bold: true, color: { rgb: "FFFFFF" } };
                    cell.s.alignment = { horizontal: "center", vertical: "center" };
                } else {
                    cell.s.font = { name: "Arial", sz: 10, color: { rgb: "000000" } };
                    if (colIndex === 0 || colIndex === 1) {
                        cell.s.alignment = { horizontal: "left", vertical: "center" };
                    } else {
                        cell.s.alignment = { horizontal: "center", vertical: "center" };
                    }
                    
                    // Highlight rows
                    cell.s.fill = { fgColor: { rgb: "FFF7ED" } }; // Soft orange/peach warning fill
                    cell.s.font.color = { rgb: "9A3412" };
                }
            }
        }
        
        const summaryWB = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(summaryWB, summaryWS, "Summary_Report");
        const summaryBuffer = XLSX.write(summaryWB, { bookType: 'xlsx', type: 'array' });
        const summaryBlob = new Blob([summaryBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        zip.file("Invoice_Error_Summary.xlsx", summaryBlob);
        
        // Package Zip
        updateInvProgress(95, "Compiling final ZIP package...");
        await new Promise(r => setTimeout(r, 200));
        
        const zipBlob = await zip.generateAsync({ type: "blob" });
        
        invGeneratedZipBlob = zipBlob;
        invGeneratedZipName = `myntra_error-bundle.zip`;
        
        updateInvProgress(100, "Success!");
        showToast(`Invoice error package created successfully! Deleted ${lockedRowsCount} 'Invoice Locked' rows.`, "success");
        
        if (invPreviewTbody) {
            invPreviewTbody.innerHTML = htmlPreview;
        }
        
        // Update button state to Download
        btnInvRun.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download Invoice Error ZIP
        `;
        btnInvRun.style.background = "var(--color-unmatched)"; // Warm Orange
        btnInvRun.style.borderColor = "var(--color-unmatched)";
        btnInvRun.disabled = false;
        
    } catch (err) {
        console.error(err);
        showToast("Error processing invoice errors: " + err.message, "error");
        btnInvRun.disabled = false;
        invProgress.classList.add('hidden');
    }
}

function getUniqueSheetName(name, existingNames) {
    // Truncate to max 31 characters (Excel limitation) and remove invalid characters like: \ / ? * [ ]
    let cleaned = name.replace(/[\\\/:\?\*\[\]]/g, "_");
    let truncated = cleaned.substring(0, 31);
    if (!existingNames.has(truncated.toLowerCase())) {
        existingNames.add(truncated.toLowerCase());
        return truncated;
    }
    let counter = 1;
    while (true) {
        const suffix = `_${counter}`;
        const checkName = cleaned.substring(0, 31 - suffix.length) + suffix;
        if (!existingNames.has(checkName.toLowerCase())) {
            existingNames.add(checkName.toLowerCase());
            return checkName;
        }
        counter++;
    }
}


/* ==========================================================================
   ERROR TRACKING DATABASE & DASHBOARD LOGIC (SHARED CLOUD / LOCAL FALLBACK)
   ========================================================================== */

function setupErrorTracker() {
    const searchInput = document.getElementById('trackerSearchInput');
    const statusFilter = document.getElementById('trackerStatusFilter');
    const sourceFilter = document.getElementById('trackerSourceFilter');
    const clearDbBtn = document.getElementById('clearTrackerDbBtn');

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderErrorTracker();
        });
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            renderErrorTracker();
        });
    }
    if (sourceFilter) {
        sourceFilter.addEventListener('change', () => {
            renderErrorTracker();
        });
    }
    if (clearDbBtn) {
        clearDbBtn.addEventListener('click', () => {
            showCustomConfirm(
                "Clear History",
                "Are you sure you want to delete all tracked error dispute history from Google Sheets and localStorage? This will wipe all records permanently.",
                async (confirmed) => {
                    if (confirmed) {
                        clearDbBtn.setAttribute('disabled', 'true');
                        clearDbBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Clearing...';
                        await clearTrackedErrorsDb();
                        clearDbBtn.removeAttribute('disabled');
                        clearDbBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Clear History';
                        renderErrorTracker();
                    }
                }
            );
        });
    }
    
    // Check status initially
    updateTrackerSyncBadge();
}

// Custom Confirmation Modal System
function showCustomConfirm(title, message, callback) {
    let backdrop = document.getElementById('customConfirmBackdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'customConfirmBackdrop';
        backdrop.className = 'custom-modal-backdrop';
        backdrop.innerHTML = `
            <div class="custom-modal-card" style="border: 1px solid rgba(220, 38, 38, 0.15); box-shadow: 0 20px 25px -5px rgba(220, 38, 38, 0.05); padding: 1.5rem; background: white; border-radius: 12px;">
                <div class="custom-modal-header" style="display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1rem;">
                    <span class="custom-modal-icon error" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 50%; font-size: 1.25rem;"><i class="fa-solid fa-triangle-exclamation"></i></span>
                    <h3 class="custom-modal-title" id="customConfirmTitle" style="font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 1.25rem; color: #1f2937; margin: 0;">Confirm Action</h3>
                </div>
                <div class="custom-modal-body" id="customConfirmBody" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.95rem; color: #4b5563; line-height: 1.6; margin-bottom: 1.5rem; white-space: pre-line;"></div>
                <div class="custom-modal-footer" style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="btn btn-secondary" id="customConfirmCancelBtn" style="min-width: 90px; height: 38px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s ease;">Cancel</button>
                    <button class="btn btn-primary" id="customConfirmOkBtn" style="background: linear-gradient(135deg, #ef4444, #dc2626); border-color: #dc2626; color: white; min-width: 90px; height: 38px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s ease;">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(backdrop);
    }

    const titleEl = document.getElementById('customConfirmTitle');
    const bodyEl = document.getElementById('customConfirmBody');
    const okBtn = document.getElementById('customConfirmOkBtn');
    const cancelBtn = document.getElementById('customConfirmCancelBtn');

    titleEl.innerText = title;
    bodyEl.innerText = message;

    // Reset event listeners by cloning buttons
    const newOkBtn = okBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newOkBtn.addEventListener('click', () => {
        backdrop.classList.remove('show');
        callback(true);
    });

    const closeConfirm = () => {
        backdrop.classList.remove('show');
        callback(false);
    };

    newCancelBtn.addEventListener('click', closeConfirm);
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
            closeConfirm();
        }
    });

    // Show modal
    setTimeout(() => {
        backdrop.classList.add('show');
    }, 50);
}

// Helper: format sync status badge
function updateTrackerSyncBadge() {
    const badge = document.getElementById('trackerSyncBadge');
    if (!badge) return;
    if (trackerSyncStatus === 'online') {
        badge.style.background = 'rgba(5, 150, 105, 0.1)';
        badge.style.color = 'var(--color-success)';
        badge.style.borderColor = 'rgba(5, 150, 105, 0.2)';
        badge.innerText = 'Google Sheets Sync Active';
    } else {
        badge.style.background = 'rgba(245, 158, 11, 0.1)';
        badge.style.color = '#d97706';
        badge.style.borderColor = 'rgba(245, 158, 11, 0.2)';
        badge.innerText = 'Offline Backup Mode';
    }
}

// 1. Fetch error records (remote first, local fallback)
async function fetchTrackedErrors() {
    try {
        if (appsScriptUrl) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 sec timeout
            
            const response = await fetch(`${appsScriptUrl}?action=getTrackedErrors`, { signal: controller.signal });
            clearTimeout(timeoutId);
            const result = await response.json();
            if (result && result.status === 'success') {
                trackerSyncStatus = 'online';
                updateTrackerSyncBadge();
                // Cache locally
                localStorage.setItem('trackedErrors', JSON.stringify(result.errors || []));
                return result.errors || [];
            }
        }
    } catch (e) {
        console.warn("Google Sheets Error Tracker connection failed, using local storage:", e);
    }
    
    trackerSyncStatus = 'offline';
    updateTrackerSyncBadge();
    
    // Local fallback
    let records = JSON.parse(localStorage.getItem('trackedErrors') || '[]');
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    records = records.filter(r => (now - new Date(r.createdDate).getTime()) < THIRTY_DAYS_MS);
    localStorage.setItem('trackedErrors', JSON.stringify(records));
    return records;
}

// 2. Register a new error entry (sends to Google Sheets in bg, duplicates to local)
async function registerTrackedError(type, fileName, partyOrWh, errorType, rowsCount) {
    const newRecord = {
        id: 'err-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        type: type, // 'myntra' or 'invoice'
        fileName: fileName,
        partyOrWh: partyOrWh,
        errorType: errorType,
        rowsCount: rowsCount,
        createdDate: new Date().toISOString(),
        solved: false,
        solvedDate: ''
    };

    // Local duplicate immediately (ensures instant load / offline fallback)
    let records = JSON.parse(localStorage.getItem('trackedErrors') || '[]');
    records.push(newRecord);
    localStorage.setItem('trackedErrors', JSON.stringify(records));

    try {
        if (appsScriptUrl) {
            const response = await fetch(`${appsScriptUrl}?action=addTrackedError`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' }, // Avoid CORS preflight on Apps Script
                body: JSON.stringify(newRecord)
            });
            const result = await response.json();
            if (result && result.status === 'success') {
                trackerSyncStatus = 'online';
                updateTrackerSyncBadge();
            }
        }
    } catch (e) {
        console.warn("Failed to write tracked error to Google Sheets:", e);
    }
}

// 3. Mark an error as solved
async function solveTrackedError(id) {
    const solvedDate = new Date().toISOString();

    // Update locally immediately
    let records = JSON.parse(localStorage.getItem('trackedErrors') || '[]');
    const idx = records.findIndex(r => r.id === id);
    if (idx !== -1) {
        records[idx].solved = true;
        records[idx].solvedDate = solvedDate;
        localStorage.setItem('trackedErrors', JSON.stringify(records));
    }

    try {
        if (appsScriptUrl) {
            const response = await fetch(`${appsScriptUrl}?action=solveTrackedError`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    id: id,
                    solvedDate: solvedDate
                })
            });
            const result = await response.json();
            if (result && result.status === 'success') {
                trackerSyncStatus = 'online';
                updateTrackerSyncBadge();
            }
        }
    } catch (e) {
        console.warn("Failed to solve tracked error on Google Sheets:", e);
    }
}

// 4. Clear all tracked errors database
async function clearTrackedErrorsDb() {
    localStorage.removeItem('trackedErrors');

    try {
        if (appsScriptUrl) {
            const response = await fetch(`${appsScriptUrl}?action=clearTrackedErrors`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' }
            });
            const result = await response.json();
            if (result && result.status === 'success') {
                trackerSyncStatus = 'online';
                updateTrackerSyncBadge();
            }
        }
    } catch (e) {
        console.warn("Failed to clear tracked errors on Google Sheets:", e);
    }
}

// 4.5. Delete a specific error entry from database
async function deleteTrackedError(id) {
    // Update locally immediately
    let records = JSON.parse(localStorage.getItem('trackedErrors') || '[]');
    records = records.filter(r => r.id !== id);
    localStorage.setItem('trackedErrors', JSON.stringify(records));

    try {
        if (appsScriptUrl) {
            const response = await fetch(`${appsScriptUrl}?action=deleteTrackedError`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ id: id })
            });
            const result = await response.json();
            if (result && result.status === 'success') {
                trackerSyncStatus = 'online';
                updateTrackerSyncBadge();
            }
        }
    } catch (e) {
        console.warn("Failed to delete tracked error on Google Sheets:", e);
    }
}

// 5. Render Tracker Dashboard
async function renderErrorTracker() {
    const statsActive = document.getElementById('statsActiveErrors');
    const statsSolved = document.getElementById('statsSolvedErrors');
    const statsTotal = document.getElementById('statsTotalErrors');
    const container = document.getElementById('trackerTableContainer');
    const searchInput = document.getElementById('trackerSearchInput');
    const statusFilter = document.getElementById('trackerStatusFilter');
    const sourceFilter = document.getElementById('trackerSourceFilter');

    if (!container) return;

    // Display spinner while loading
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">
                <svg class="fa-spin" viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
            </div>
            <p>Loading tracked errors list from database...</p>
        </div>
    `;

    const errors = await fetchTrackedErrors();
    
    // Calculate counts
    const activeCount = errors.filter(e => !e.solved).length;
    const solvedCount = errors.filter(e => e.solved).length;
    const totalCount = errors.length;

    if (statsActive) statsActive.innerText = activeCount;
    if (statsSolved) statsSolved.innerText = solvedCount;
    if (statsTotal) statsTotal.innerText = totalCount;

    // Apply filters
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const statusVal = statusFilter ? statusFilter.value : 'all';
    const sourceVal = sourceFilter ? sourceFilter.value : 'all';

    const filtered = errors.filter(item => {
        // Search query matches fileName, partyOrWh, or errorType
        const matchesQuery = !query || 
            String(item.fileName).toLowerCase().includes(query) ||
            String(item.partyOrWh).toLowerCase().includes(query) ||
            String(item.errorType).toLowerCase().includes(query);
        
        // Status match
        const matchesStatus = statusVal === 'all' || 
            (statusVal === 'active' && !item.solved) ||
            (statusVal === 'solved' && item.solved);
        
        // Source match
        const matchesSource = sourceVal === 'all' || item.type === sourceVal;

        return matchesQuery && matchesStatus && matchesSource;
    });

    // Sort: active (unsolved) first, then by date descending
    filtered.sort((a, b) => {
        if (a.solved !== b.solved) {
            return a.solved ? 1 : -1;
        }
        return new Date(b.createdDate) - new Date(a.createdDate);
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-od);"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <p>No tracked errors match your criteria.</p>
            </div>
        `;
        return;
    }

    // Render Table
    const table = document.createElement('table');
    table.className = 'preview-table';
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '0.85rem';
    table.style.textAlign = 'left';

    table.innerHTML = `
        <thead>
            <tr style="border-bottom: 2px solid var(--border-color); color: var(--text-primary);">
                <th style="padding: 0.75rem; font-weight: 700; font-size: 0.75rem; text-transform: uppercase;">Source</th>
                <th style="padding: 0.75rem; font-weight: 700; font-size: 0.75rem; text-transform: uppercase;">File / Error Details</th>
                <th style="padding: 0.75rem; font-weight: 700; font-size: 0.75rem; text-transform: uppercase;">Party / Wh</th>
                <th style="padding: 0.75rem; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; text-align: right;">Rows</th>
                <th style="padding: 0.75rem; font-weight: 700; font-size: 0.75rem; text-transform: uppercase;">Date Added</th>
                <th style="padding: 0.75rem; font-weight: 700; font-size: 0.75rem; text-transform: uppercase;">Days Active</th>
                <th style="padding: 0.75rem; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; text-align: center;">Status</th>
                <th style="padding: 0.75rem; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; text-align: center;">Action</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    filtered.forEach((record, index) => {
        const tr = document.createElement('tr');
        tr.className = `row-color-${index % 7}`;
        tr.style.borderBottom = '1px solid var(--border-color)';
        
        // Source badge
        let sourceBadge = '';
        if (record.type === 'myntra') {
            sourceBadge = `<span style="background: rgba(0, 150, 199, 0.08); color: #0096c7; border: 1px solid rgba(0, 150, 199, 0.15); padding: 0.2rem 0.45rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">MYNTRA SALE ERROR</span>`;
        } else if (record.type === 'purchase') {
            sourceBadge = `<span style="background: rgba(123, 44, 191, 0.08); color: #7b2cbf; border: 1px solid rgba(123, 44, 191, 0.15); padding: 0.2rem 0.45rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">PURCHASE DISPUTE</span>`;
        } else if (record.type === 'loss') {
            sourceBadge = `<span style="background: rgba(225, 29, 72, 0.08); color: #e11d48; border: 1px solid rgba(225, 29, 72, 0.15); padding: 0.2rem 0.45rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">LOSS ERROR</span>`;
        } else {
            sourceBadge = `<span style="background: rgba(245, 158, 11, 0.08); color: #b45309; border: 1px solid rgba(245, 158, 11, 0.15); padding: 0.2rem 0.45rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">INVOICE ERROR</span>`;
        }

        // Error Type details
        const detailHtml = `
            <div style="font-weight: 600; color: var(--text-primary);">${record.fileName}</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.1rem;">${record.errorType}</div>
        `;

        // Day counter logic
        const createdTime = new Date(record.createdDate).getTime();
        const endTime = record.solved ? new Date(record.solvedDate).getTime() : Date.now();
        const diffDays = Math.max(0, Math.floor((endTime - createdTime) / (1000 * 60 * 60 * 24)));
        const daysText = record.solved 
            ? `<span style="color: var(--text-secondary); font-size: 0.8rem;">Solved in ${diffDays} day${diffDays === 1 ? '' : 's'}</span>`
            : `<span style="color: #ef4444; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; gap: 0.25rem;"><svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" style="margin-right:2px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${diffDays} Day${diffDays === 1 ? '' : 's'}</span>`;

        // Date Added formatted cleanly
        const addedDateFormatted = new Date(record.createdDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

        // Status badge
        const statusBadge = record.solved
            ? `<span style="background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); padding: 0.25rem 0.5rem; border-radius: 20px; font-weight: 600; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.3rem;"><svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" style="margin-right:2px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Solved</span>`
            : `<span style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); padding: 0.25rem 0.5rem; border-radius: 20px; font-weight: 600; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.3rem;"><svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" style="margin-right:2px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Active</span>`;

        // Action buttons (Solve + Delete)
        const actionHtml = record.solved
            ? `<div style="display: flex; gap: 0.4rem; justify-content: center; align-items: center;">
                   <span style="font-size: 0.75rem; color: var(--text-secondary); font-style: italic; margin-right: 0.3rem;">Solved</span>
                   <button class="btn delete-tracker-btn" data-id="${record.id}" style="padding: 0.35rem 0.6rem; font-size: 0.75rem; border-radius: 6px; background: rgba(239, 68, 68, 0.08); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.15); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; border: none;"><svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
               </div>`
            : `<div style="display: flex; gap: 0.4rem; justify-content: center; align-items: center;">
                   <button class="btn solve-tracker-btn" data-id="${record.id}" style="padding: 0.35rem 0.7rem; font-size: 0.75rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.3rem; background: #10b981; color: white; cursor: pointer; font-weight: 600; border: none; box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);"><svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" style="margin-right:2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Solve</button>
                   <button class="btn delete-tracker-btn" data-id="${record.id}" style="padding: 0.35rem 0.6rem; font-size: 0.75rem; border-radius: 6px; background: rgba(239, 68, 68, 0.08); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.15); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; border: none;"><svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
               </div>`;

        tr.innerHTML = `
            <td style="padding: 0.75rem; vertical-align: middle;">${sourceBadge}</td>
            <td style="padding: 0.75rem; vertical-align: middle;">${detailHtml}</td>
            <td style="padding: 0.75rem; vertical-align: middle; font-weight: 500; color: var(--text-secondary);">${record.partyOrWh}</td>
            <td style="padding: 0.75rem; vertical-align: middle; text-align: right; font-weight: 600; color: var(--text-secondary);">${record.rowsCount}</td>
            <td style="padding: 0.75rem; vertical-align: middle; color: var(--text-secondary);">${addedDateFormatted}</td>
            <td style="padding: 0.75rem; vertical-align: middle;">${daysText}</td>
            <td style="padding: 0.75rem; vertical-align: middle; text-align: center;">${statusBadge}</td>
            <td style="padding: 0.75rem; vertical-align: middle; text-align: center;">${actionHtml}</td>
        `;

        // Event listener for solve button
        const solveBtn = tr.querySelector('.solve-tracker-btn');
        if (solveBtn) {
            solveBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                solveBtn.setAttribute('disabled', 'true');
                solveBtn.innerHTML = '<svg class="fa-spin" viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>';
                await solveTrackedError(record.id);
                renderErrorTracker();
            });
        }

        // Event listener for delete button
        const deleteBtn = tr.querySelector('.delete-tracker-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showCustomConfirm(
                    "Delete Record",
                    `Are you sure you want to delete the tracked error record for "${record.fileName}"? This action cannot be undone.`,
                    async (confirmed) => {
                        if (confirmed) {
                            deleteBtn.setAttribute('disabled', 'true');
                            deleteBtn.innerHTML = '<svg class="fa-spin" viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>';
                            await deleteTrackedError(record.id);
                            renderErrorTracker();
                        }
                    }
                );
            });
        }

        tbody.appendChild(tr);
    });

    container.innerHTML = '';
    container.appendChild(table);
}

// Expose functions globally for debugging/console testing
window.errorTracker = {
    fetch: fetchTrackedErrors,
    register: registerTrackedError,
    solve: solveTrackedError,
    delete: deleteTrackedError,
    clear: clearTrackedErrorsDb,
    render: renderErrorTracker
};

// ==========================
// CLEAN & RESET TAB LOGIC
// ==========================

function setupCleanAndResetButtons() {
    const btnResetProcessor = document.getElementById('btn-reset-processor');
    const btnResetRename = document.getElementById('btn-reset-rename');
    const btnResetMerge = document.getElementById('btn-reset-merge');
    const btnResetSeparate = document.getElementById('btn-reset-separate');
    const btnResetFolderCreate = document.getElementById('btn-reset-folder-create');
    const btnResetDatabase = document.getElementById('btn-reset-database');
    const btnResetMyntraError = document.getElementById('btn-reset-myntra-error');
    const btnResetPurchaseError = document.getElementById('btn-reset-purchase-error');
    const btnResetInvoiceError = document.getElementById('btn-reset-invoice-error');
    const btnResetLossError = document.getElementById('btn-reset-loss-error');
    const btnResetErrorTracker = document.getElementById('btn-reset-error-tracker');

    if (btnResetProcessor) btnResetProcessor.addEventListener('click', resetProcessorTab);
    if (btnResetRename) btnResetRename.addEventListener('click', resetRenameTab);
    if (btnResetMerge) btnResetMerge.addEventListener('click', resetMergeTab);
    if (btnResetSeparate) btnResetSeparate.addEventListener('click', resetSeparateTab);
    if (btnResetFolderCreate) btnResetFolderCreate.addEventListener('click', resetFolderCreateTab);
    if (btnResetDatabase) btnResetDatabase.addEventListener('click', resetDatabaseTab);
    if (btnResetMyntraError) btnResetMyntraError.addEventListener('click', resetMyntraErrorTab);
    if (btnResetPurchaseError) btnResetPurchaseError.addEventListener('click', resetPurchaseErrorTab);
    if (btnResetInvoiceError) btnResetInvoiceError.addEventListener('click', resetInvoiceErrorTab);
    if (btnResetLossError) btnResetLossError.addEventListener('click', resetLossErrorTab);
    if (btnResetErrorTracker) btnResetErrorTracker.addEventListener('click', resetErrorTrackerTab);
}

function resetProcessorTab() {
    filesList = [];
    isProcessed = false;
    uploadedZipBaseName = "";
    if (fileInput) fileInput.value = "";
    if (folderInput) folderInput.value = "";
    if (searchInput) searchInput.value = "";

    if (tableContainer) tableContainer.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');
    if (inlineProgress) inlineProgress.classList.add('hidden');
    if (dashboardControls) dashboardControls.classList.add('hidden');
    if (mappingCard) mappingCard.classList.add('hidden');
    if (filesTbody) filesTbody.innerHTML = "";

    if (btnProcessAction) {
        btnProcessAction.classList.add('hidden');
        btnProcessAction.disabled = false;
    }
    if (btnDownloadZip) {
        btnDownloadZip.classList.add('hidden');
    }

    const rangeVal = document.getElementById('range-value');
    if (rangeVal) rangeVal.textContent = "—";

    const cancelledInvoicesList = document.getElementById('cancelled-invoices-list');
    if (cancelledInvoicesList) cancelledInvoicesList.innerHTML = '<span class="text-muted" style="color: var(--text-muted);">None logged yet...</span>';

    const consoleLogs = document.getElementById('console-logs');
    if (consoleLogs) consoleLogs.innerHTML = '<div class="log-line text-muted" style="color: var(--text-muted);">Ready to run pipeline...</div>';

    const statTotal = document.getElementById('stat-total');
    const statOd = document.getElementById('stat-od');
    const statDt = document.getElementById('stat-dt');
    const statDtSold = document.getElementById('stat-dt-sold');
    const statDtCancelled = document.getElementById('stat-dt-cancelled');
    const statUnmatched = document.getElementById('stat-unmatched');
    if (statTotal) statTotal.textContent = "0";
    if (statOd) statOd.textContent = "0";
    if (statDt) statDt.textContent = "0";
    if (statDtSold) statDtSold.textContent = "0";
    if (statDtCancelled) statDtCancelled.textContent = "0";
    if (statUnmatched) statUnmatched.textContent = "0";

    showToast("Processor tab cleaned & reset.", "success");
}

function resetRenameTab() {
    renUploadedFiles = [];
    renIsProcessed = false;
    renGeneratedZipBlob = null;
    renGeneratedZipName = "";
    renActiveEditFile = null;

    const renFileInputP2 = document.getElementById('ren-file-input-p2');
    if (renFileInputP2) renFileInputP2.value = "";

    const renFileInputG = document.getElementById('ren-file-input-g');
    if (renFileInputG) renFileInputG.value = "";

    updateRenUploadBadges();

    const renProgress = document.getElementById('ren-progress');
    if (renProgress) renProgress.classList.add('hidden');

    const emptyState = document.getElementById('ren-empty-state');
    if (emptyState) emptyState.classList.remove('hidden');

    const stagedState = document.getElementById('ren-staged-state');
    if (stagedState) stagedState.classList.add('hidden');

    const resultsContainer = document.getElementById('ren-results-container');
    if (resultsContainer) resultsContainer.classList.add('hidden');

    const tbodyOrder = document.getElementById('tbody-order-files');
    if (tbodyOrder) tbodyOrder.innerHTML = "";

    const tbodyTax = document.getElementById('tbody-tax-files');
    if (tbodyTax) tbodyTax.innerHTML = "";

    const btnRenameRun = document.getElementById('btn-rename-run');
    if (btnRenameRun) btnRenameRun.classList.add('hidden');

    closeEditPrefixModal();
    const renFullviewModal = document.getElementById('ren-fullview-modal');
    if (renFullviewModal) renFullviewModal.classList.remove('show');

    // Clear 1-hour IndexedDB session storage immediately
    clearRenameSessionStorage();

    showToast("Rename tab cleaned & reset.", "success");
}

function resetMergeTab() {
    mrgUploadedFiles = [];
    mrgUniqueGroups = [];
    mrgGroupsMap = new Map();
    mrgGeneratedZipBlob = null;
    mrgGeneratedZipName = "";
    mrgSingleFileBlob = null;
    mrgSingleFileName = "";

    const mrgFileInput = document.getElementById('mrg-file-input');
    if (mrgFileInput) mrgFileInput.value = "";

    const mrgFileLabel = document.getElementById('mrg-file-label');
    if (mrgFileLabel) mrgFileLabel.textContent = "Drag & Drop files here";

    const mrgGroupCount = document.getElementById('mrg-group-count');
    if (mrgGroupCount) mrgGroupCount.textContent = "0 groups detected";

    const mrgProgress = document.getElementById('mrg-progress');
    if (mrgProgress) mrgProgress.classList.add('hidden');

    const mrgTableContainer = document.getElementById('mrg-table-container');
    if (mrgTableContainer) mrgTableContainer.classList.add('hidden');

    const mrgEmptyState = document.getElementById('mrg-empty-state');
    if (mrgEmptyState) mrgEmptyState.classList.remove('hidden');

    const mrgPreviewTbody = document.getElementById('mrg-preview-tbody');
    if (mrgPreviewTbody) mrgPreviewTbody.innerHTML = "";

    const mrgHeaderActions = document.getElementById('mrg-header-actions');
    if (mrgHeaderActions) mrgHeaderActions.classList.add('hidden');

    const btnMergeRun = document.getElementById('btn-merge-run');
    if (btnMergeRun) {
        btnMergeRun.classList.add('hidden');
        btnMergeRun.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>
            Merge Files
        `;
        btnMergeRun.style.background = "";
        btnMergeRun.style.borderColor = "";
        btnMergeRun.disabled = false;
    }

    closeMrgFullViewModal();
    closeEditGroupKeyModal();
    clearMergeSessionStorage();

    showToast("Merge tab cleaned & reset.", "success");
}

function resetSeparateTab() {
    sepCategoryState = {
        simple: { file: null, fileName: '', aoa: null, uniqueValues: [], groups: new Map() },
        details: { file: null, fileName: '', aoa: null, uniqueValues: [], groups: new Map() },
        summary: { file: null, fileName: '', aoa: null, uniqueValues: [], groups: new Map() },
        tax: { file: null, fileName: '', aoa: null, uniqueValues: [], groups: new Map() }
    };

    ['simple', 'details', 'summary', 'tax'].forEach(catKey => {
        const input = document.getElementById(`sep-file-input-${catKey}`);
        if (input) input.value = "";

        const label = document.getElementById(`sep-file-label-${catKey}`);
        if (label) {
            const names = { simple: 'Upload SIMPLE File', details: 'Upload DETAILS File', summary: 'Upload SUMMARY File', tax: 'Upload TAX SPLIT File' };
            label.textContent = names[catKey] || 'Upload File';
        }

        const badge = document.getElementById(`sep-badge-${catKey}`);
        if (badge) badge.textContent = "0 unique";

        const card = document.getElementById(`card-sep-${catKey}`);
        if (card) card.classList.add('hidden');

        const tbody = document.getElementById(`tbody-sep-${catKey}`);
        if (tbody) tbody.innerHTML = "";
    });

    const sepProgress = document.getElementById('sep-progress');
    if (sepProgress) sepProgress.classList.add('hidden');

    const sepEmptyState = document.getElementById('sep-empty-state');
    if (sepEmptyState) sepEmptyState.classList.remove('hidden');

    const sepResultsContainer = document.getElementById('sep-results-container');
    if (sepResultsContainer) sepResultsContainer.classList.add('hidden');

    closeSepFullViewModal();
    clearSeparateSessionStorage();

    showToast("Separate tab cleaned & reset.", "success");
}

function resetFolderCreateTab() {
    fldUploadedFiles = [];
    fldExpandedFolders.clear();
    fldGeneratedZipBlob = null;
    fldGeneratedZipName = "";

    const fldFileInput = document.getElementById('fld-file-input');
    const fldFolderInput = document.getElementById('fld-folder-input');
    const fldManualInput = document.getElementById('fld-manual-file-input');
    if (fldFileInput) fldFileInput.value = "";
    if (fldFolderInput) fldFolderInput.value = "";
    if (fldManualInput) fldManualInput.value = "";

    const fldFileLabel = document.getElementById('fld-file-label');
    if (fldFileLabel) fldFileLabel.textContent = "Drag & Drop files here";

    const fldFileCount = document.getElementById('fld-file-count');
    if (fldFileCount) fldFileCount.textContent = "0 files loaded";

    const fldMissingBadge = document.getElementById('fld-missing-badge');
    if (fldMissingBadge) fldMissingBadge.classList.add('hidden');

    const fldHeaderActions = document.getElementById('fld-header-actions');
    if (fldHeaderActions) fldHeaderActions.classList.add('hidden');

    const fldProgress = document.getElementById('fld-progress');
    if (fldProgress) fldProgress.classList.add('hidden');

    const fldTableContainer = document.getElementById('fld-table-container');
    if (fldTableContainer) fldTableContainer.classList.add('hidden');

    const fldEmptyState = document.getElementById('fld-empty-state');
    if (fldEmptyState) fldEmptyState.classList.remove('hidden');

    const fldSelectedCard = document.getElementById('fld-selected-card');
    if (fldSelectedCard) fldSelectedCard.style.display = 'none';

    const fldPreviewTbody = document.getElementById('fld-preview-tbody');
    if (fldPreviewTbody) fldPreviewTbody.innerHTML = "";

    const fldSelectedList = document.getElementById('fld-selected-list');
    if (fldSelectedList) fldSelectedList.innerHTML = "";

    const btnFldRun = document.getElementById('btn-fld-run');
    if (btnFldRun) {
        btnFldRun.classList.add('hidden');
        btnFldRun.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
            Create Folders & Zip
        `;
        btnFldRun.style.background = "";
        btnFldRun.style.borderColor = "";
        btnFldRun.disabled = false;
    }

    closeFldFullViewModal();
    closeCopyFileToFoldersModal();
    closeEditFldFileModal();
    clearFolderCreateSessionStorage();

    showToast("Folder Create tab cleaned & reset.", "success");
}

function resetDatabaseTab() {
    editingPartyCode = null;
    const formAddParty = document.getElementById('form-add-party');
    if (formAddParty) formAddParty.reset();

    const dbSearchInput = document.getElementById('db-search-input');
    if (dbSearchInput) dbSearchInput.value = "";

    if (typeof renderPartyTable === 'function') {
        renderPartyTable();
    }
    showToast("Party database inputs cleaned & reset.", "success");
}

function resetMyntraErrorTab() {
    errDetailsFile = null;
    errDataFile = null;
    errGeneratedZipBlob = null;
    errGeneratedZipName = "";
    if (typeof resetErrorButtonState === 'function') {
        resetErrorButtonState();
    }

    const errDetailsInput = document.getElementById('err-details-file-input');
    const errDataInput = document.getElementById('err-data-file-input');
    const errFromDate = document.getElementById('err-from-date');
    const errToDate = document.getElementById('err-to-date');

    if (errDetailsInput) errDetailsInput.value = "";
    if (errDataInput) errDataInput.value = "";
    if (errFromDate) errFromDate.value = "";
    if (errToDate) errToDate.value = "";

    const errDetailsLabel = document.getElementById('err-details-label');
    if (errDetailsLabel) errDetailsLabel.textContent = "Drag or click to upload Details";

    const errDataLabel = document.getElementById('err-data-label');
    if (errDataLabel) errDataLabel.textContent = "Drag or click to upload Data";

    const tagDetails = document.getElementById('err-details-tag');
    if (tagDetails) {
        tagDetails.textContent = "Required";
        tagDetails.style.background = "rgba(239, 68, 68, 0.1)";
        tagDetails.style.color = "#ef4444";
    }
    const tagData = document.getElementById('err-data-tag');
    if (tagData) {
        tagData.textContent = "Required";
        tagData.style.background = "rgba(239, 68, 68, 0.1)";
        tagData.style.color = "#ef4444";
    }

    const errFileCount = document.getElementById('err-file-count');
    if (errFileCount) errFileCount.textContent = "0 files loaded";

    const errProgress = document.getElementById('err-progress');
    if (errProgress) errProgress.classList.add('hidden');

    const errTableContainer = document.getElementById('err-table-container');
    if (errTableContainer) errTableContainer.classList.add('hidden');

    const errEmptyState = document.getElementById('err-empty-state');
    if (errEmptyState) errEmptyState.classList.remove('hidden');

    const errPreviewTbody = document.getElementById('err-preview-tbody');
    if (errPreviewTbody) errPreviewTbody.innerHTML = "";

    const btnErrorRun = document.getElementById('btn-error-run');
    if (btnErrorRun) {
        btnErrorRun.classList.add('hidden');
    }

    showToast("Myntra Error tab cleaned & reset.", "success");
}

function resetInvoiceErrorTab() {
    invUploadedFiles = [];
    resetInvoiceErrorButtonState();

    const invFileInput = document.getElementById('inv-file-input');
    if (invFileInput) invFileInput.value = "";

    const invFileCount = document.getElementById('inv-file-count');
    if (invFileCount) invFileCount.textContent = "0 files loaded";

    const invProgress = document.getElementById('inv-progress');
    if (invProgress) invProgress.classList.add('hidden');

    const invTableContainer = document.getElementById('inv-table-container');
    if (invTableContainer) invTableContainer.classList.add('hidden');

    const invEmptyState = document.getElementById('inv-empty-state');
    if (invEmptyState) invEmptyState.classList.remove('hidden');

    const invPreviewTbody = document.getElementById('inv-preview-tbody');
    if (invPreviewTbody) invPreviewTbody.innerHTML = "";

    const btnInvRun = document.getElementById('btn-inv-run');
    if (btnInvRun) {
        btnInvRun.classList.add('hidden');
    }

    showToast("Invoice Error tab cleaned & reset.", "success");
}

function resetErrorTrackerTab() {
    const trackerSearchInput = document.getElementById('trackerSearchInput');
    if (trackerSearchInput) trackerSearchInput.value = "";

    const trackerStatusFilter = document.getElementById('trackerStatusFilter');
    if (trackerStatusFilter) trackerStatusFilter.value = "all";

    const trackerSourceFilter = document.getElementById('trackerSourceFilter');
    if (trackerSourceFilter) trackerSourceFilter.value = "all";

    if (typeof loadTrackerFromDatabase === 'function') {
        loadTrackerFromDatabase();
    }
    showToast("Error Dispute Tracker filters reset.", "success");
}

function resetPurchaseErrorTab() {
    mePurchaseDetailsFiles = [];
    mePurchaseDataFile = null;
    mePurchaseZipBlob = null;
    mePurchaseZipFilename = "";
    mePurchaseMergedBlob = null;
    mePurchaseMergedFilename = "";

    const purchaseInput = document.getElementById('mePurchaseDetailsFileInput');
    if (purchaseInput) purchaseInput.value = "";

    const dataInput = document.getElementById('mePurchaseDataFileInput');
    if (dataInput) dataInput.value = "";

    const displayData = document.getElementById('mePurchaseDataFileDisplay');
    if (displayData) {
        displayData.innerText = "Drag or click to choose Myntra Data file";
        displayData.title = "";
    }

    const dataDropzone = document.getElementById('mePurchaseDataDropzone');
    if (dataDropzone) dataDropzone.classList.remove('file-selected');

    const progressCard = document.getElementById('mePurchaseProgressCard');
    if (progressCard) progressCard.classList.add('hidden');

    const outputContainer = document.getElementById('mePurchaseOutputContainer');
    if (outputContainer) {
        outputContainer.innerHTML = `
            <div class="empty-output-state">
                <i class="fa-solid fa-bag-shopping placeholder-icon" style="color: #7b2cbf; font-size: 2.5rem; margin-bottom: 0.5rem; opacity: 0.6;"></i>
                <p style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500;">Upload Purchase Details & Myntra Data files and click process to run Purchase Error logic.</p>
            </div>
        `;
        outputContainer.className = 'processed-container empty';
    }

    const consoleLog = document.getElementById('mePurchaseConsoleLog');
    if (consoleLog) {
        consoleLog.innerHTML = '<div class="log-line info" style="color: #38bdf8;">[System] Tab reset. Please upload Purchase Details and Myntra Data file.</div>';
    }

    updateMePurchaseDetailsUI();
    checkMePurchaseInputs();

    showToast("Purchase Price Dispute tab cleaned & reset.", "success");
}

function resetLossErrorTab() {
    leDetailsFiles = [];
    leDataFile = null;
    leZipBlob = null;
    leZipFilename = "";
    leMergedBlob = null;
    leMergedFilename = "";

    const detailsInput = document.getElementById('leDetailsFileInput');
    if (detailsInput) detailsInput.value = "";

    const dataInput = document.getElementById('leDataFileInput');
    if (dataInput) dataInput.value = "";

    const displayData = document.getElementById('leDataFileDisplay');
    if (displayData) {
        displayData.innerText = "Drag or click to choose Myntra Data file";
        displayData.title = "";
    }

    const dataDropzone = document.getElementById('leDataDropzone');
    if (dataDropzone) dataDropzone.classList.remove('file-selected');

    const progressCard = document.getElementById('leProgressCard');
    if (progressCard) progressCard.classList.add('hidden');

    const outputContainer = document.getElementById('leOutputContainer');
    if (outputContainer) {
        outputContainer.innerHTML = `
            <div class="empty-output-state">
                <i class="fa-solid fa-arrow-trend-down placeholder-icon" style="color: #e11d48; font-size: 2.5rem; margin-bottom: 0.5rem; opacity: 0.6;"></i>
                <p style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500;">Upload Loss Details & Reference Myntra Data files and click process to run Loss Error logic.</p>
            </div>
        `;
        outputContainer.className = 'processed-container empty';
    }

    const consoleLog = document.getElementById('leConsoleLog');
    if (consoleLog) {
        consoleLog.innerHTML = '<div class="log-line info" style="color: #38bdf8;">[System] Tab reset. Please upload Loss Details and Myntra Data file.</div>';
    }

    updateLeDetailsUI();
    checkLeInputs();

    showToast("Loss Error tab cleaned & reset.", "success");
}


