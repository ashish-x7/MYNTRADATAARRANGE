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
    loadPartyData();
    setupSeparateFile();
    setupRenameFile();
    setupMergeFile();
    setupMyntraError();
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
    btnCloseModal.addEventListener('click', () => {
        inspectorModal.classList.remove('show');
    });

    inspectorModal.addEventListener('click', (e) => {
        if (e.target === inspectorModal) {
            inspectorModal.classList.remove('show');
        }
    });

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
    
    // 3. Fallback: check database or active values
    return "PartyCode";
}

// Retrieve full party code name from local database cache (or build custom fallback)
function getPartyCodeName(partyCode) {
    if (!partyCode) return "PartyCode";
    const found = partyData.find(item => String(item.code).trim() === String(partyCode).trim());
    if (found && found.partyCode) {
        return found.partyCode;
    }
    return `${partyCode}-Party`;
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
            const valAV = parseFloat(String(row[idxAV] || "").replace(/,/g, "")) || 0;
            
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
                row[idxBI] = ""; // BI empty
                
                // Calculate equivalent of: =ROUND((AV2-ROUND(AV2/1.05,4))/2,4)
                const valBJ = round4((valAV - roundPart) / 2);
                row[idxBJ] = valBJ; // BJ
                row[idxBK] = valBJ; // BK (same value)
            } else {
                // Calculate equivalent of: =ROUND(AV2-ROUND(AV2/1.05,4),4)
                const valBI = round4(valAV - roundPart);
                row[idxBI] = valBI; // BI
                row[idxBJ] = ""; // BJ
                row[idxBK] = ""; // BK
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
    
    // Step 12: Master Combined Report Join
    addLog(`[${partyCode}] Master Combined Step: Loading lookup dictionary...`, "info");
    const dtDict = new Map();
    for (let r = 1; r < filteredDtRows.length; r++) {
        const row = filteredDtRows[r] || [];
        const key = cleanKey(row[4]); // Column E (index 4)
        
        if (key !== "") {
            if (!dtDict.has(key)) {
                dtDict.set(key, [
                    row[6] || "",   // Column G (index 6) -> New Invoice ID
                    row[17] || "",  // Column R (index 17) -> Quantity
                    row[25] || "",  // Column Z (index 25) -> GST Rate / HSN
                    row[58] || ""   // Column BG (index 58) -> Item Cost
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
        newCombinedRow[1] = odRow[7] || ""; // Invoice ID (Col 8 / H)
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
                newCombinedRow[11] = dtInfo[3]; // Item Cost from DT
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
        
        filesList.push({
            id: nextId++,
            name: `${partyCode}-SUMMARY.xlsx`,
            path: `${partyCode}-SUMMARY.xlsx`,
            ext: "xlsx",
            originalFile: summaryBlob,
            category: "unmatched",
            renamedName: "SUMMARY.xlsx",
            partyCode: partyCode,
            partyRange: generatedRange,
            parsedAOA: [
                [partyCodeName],
                [generatedRange]
            ]
        });
        addLog(`[${partyCode}] SUMMARY.xlsx file generated.`, "success");
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
                
                // Add ONE combined SUMMARY file at the root level (not per-party)
                filesList.push({
                    id: nextId++,
                    name: `BATCH-SUMMARY.xlsx`,
                    path: `BATCH-SUMMARY.xlsx`,
                    ext: "xlsx",
                    originalFile: summaryBlob,
                    category: "unmatched",
                    renamedName: "SUMMARY.xlsx",
                    partyCode: "__BATCH_ROOT__",
                    partyRange: "",
                    parsedAOA: ws1Rows
                });
                addLog(`Combined SUMMARY.xlsx generated containing logs for all ${batchMetrics.length} parties.`, "success");
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
        const rName = fileObj.renamedName;
        return cat === "OD" || cat === "DT" || cat === "Combined" || 
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
        const partyCodesArray = Array.from(processedParties);
        const isBatch = partyCodesArray.length > 1;
        let zipName = "myntra_data_arrange_bundle.zip";
        
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
            
            let targetPath = "";
            if (keepStructure) {
                if (filename === "SUMMARY.xlsx" && fileObj.partyCode === "__BATCH_ROOT__") {
                    // Batch combined SUMMARY goes at the ZIP root
                    targetPath = filename;
                } else if (filename === "SUMMARY.xlsx") {
                    // Single mode SUMMARY goes under party folder
                    targetPath = `${baseFolder}/${filename}`;
                } else {
                    targetPath = `${baseFolder}/${subFolder}/${filename}`;
                }
            } else {
                if (filename.startsWith(`${partyCode}-`)) {
                    targetPath = filename;
                } else {
                    targetPath = `${partyCode}-${filename}`;
                }
            }
            
            let counter = 1;
            while (usedPaths.has(targetPath.toLowerCase())) {
                if (keepStructure) {
                    if (filename === "SUMMARY.xlsx") {
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
    
    const confirmDelete = confirm(`Are you sure you want to delete party with Code "${code}"?`);
    if (!confirmDelete) return;
    
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
            // If deleting the active editing code
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

function setupSeparateFile() {
    const sepDropzone = document.getElementById('sep-dropzone');
    const sepFileInput = document.getElementById('sep-file-input');
    const simpleColChoice = document.getElementById('simple-col-choice');
    const btnSplitRun = document.getElementById('btn-split-run');
    
    if (!sepDropzone || !sepFileInput) return;

    // Set initial display of SIMPLE column choice based on default checked radio
    const initialModeInput = document.querySelector('input[name="split-mode"]:checked');
    if (initialModeInput && initialModeInput.value === "1") {
        if (simpleColChoice) simpleColChoice.style.display = "flex";
    } else {
        if (simpleColChoice) simpleColChoice.style.display = "none";
    }

    // Dropzone Click
    sepDropzone.addEventListener('click', () => {
        sepFileInput.click();
    });

    // File selection
    sepFileInput.addEventListener('change', (e) => {
        handleSepFileSelection(e.target.files[0]);
    });

    // Drag & Drop
    sepDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        sepDropzone.classList.add('dragover');
    });

    sepDropzone.addEventListener('dragleave', () => {
        sepDropzone.classList.remove('dragover');
    });

    sepDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        sepDropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleSepFileSelection(e.dataTransfer.files[0]);
        }
    });

    // Radio button event listeners for split mode
    document.querySelectorAll('input[name="split-mode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const mode = e.target.value;
            if (mode === "1") {
                simpleColChoice.style.display = "flex";
            } else {
                simpleColChoice.style.display = "none";
            }
            resetSplitButtonState();
            if (sepParsedAOA) {
                calculateSplitGroups();
            }
        });
    });

    // Radio button event listeners for SIMPLE mode column choice
    document.querySelectorAll('input[name="simple-col"]').forEach(radio => {
        radio.addEventListener('change', () => {
            resetSplitButtonState();
            if (sepParsedAOA) {
                calculateSplitGroups();
            }
        });
    });

    // Run Split Trigger
    btnSplitRun.addEventListener('click', runSeparateProcess);
}

// Reset the split button back to Split File action state
function resetSplitButtonState() {
    sepGeneratedZipBlob = null;
    sepGeneratedZipName = "";
    const btnSplitRun = document.getElementById('btn-split-run');
    if (btnSplitRun) {
        btnSplitRun.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="8" height="18" rx="2"></rect><rect x="14" y="3" width="8" height="18" rx="2"></rect></svg>
            Split File
        `;
        btnSplitRun.style.background = ""; // Restore default style
        btnSplitRun.style.borderColor = "";
    }
}

// Handle selected separate file
async function handleSepFileSelection(file) {
    resetSplitButtonState();
    if (!file) return;
    
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
        showToast("Please upload an Excel (.xlsx or .xls) file.", "error");
        return;
    }

    sepFileObj = file;
    const sepDropzone = document.getElementById('sep-dropzone');
    const sepFileLabel = document.getElementById('sep-file-label');
    sepFileLabel.textContent = `Selected: ${file.name}`;
    
    const dotIdx = file.name.lastIndexOf('.');
    sepFileNamePrefix = dotIdx !== -1 ? file.name.substring(0, dotIdx) : file.name;

    // Show spinner inside dropzone
    const dropzoneContent = sepDropzone.querySelector('.dropzone-content');
    const originalHTML = dropzoneContent.innerHTML;
    dropzoneContent.innerHTML = `
        <div class="spinner" style="width: 32px; height: 32px; margin: 0 auto 1rem auto; display: block; border-width: 2px;"></div>
        <h3>Loading Excel File...</h3>
        <p>Parsing spreadsheet data rows</p>
    `;

    try {
        // Read file using existing AOA parsing function
        sepParsedAOA = await readExcelAsAOA(file);
        
        // Restore dropzone content
        dropzoneContent.innerHTML = originalHTML;
        document.getElementById('sep-file-label').textContent = `Loaded: ${file.name}`;
        
        showToast("Excel file parsed successfully!", "success");
        calculateSplitGroups();
    } catch (err) {
        console.error(err);
        dropzoneContent.innerHTML = originalHTML;
        showToast("Failed to parse Excel: " + err.message, "error");
    }
}

// Calculate Groups based on selected Mode and columns
function calculateSplitGroups() {
    if (!sepParsedAOA || sepParsedAOA.length === 0) return;

    const splitModeInput = document.querySelector('input[name="split-mode"]:checked');
    const simpleColInput = document.querySelector('input[name="simple-col"]:checked');
    
    const splitMode = splitModeInput ? splitModeInput.value : "1";
    const simpleCol = simpleColInput ? simpleColInput.value : "D";

    let headerRows = 2;
    let dataStartRow = 3;
    let filterField = 3; // Default Column D (Index 3)
    let nameSuffix = "-MYNTRA";

    if (splitMode === "1") {
        headerRows = 2;
        dataStartRow = 3;
        filterField = (simpleCol === "G") ? 6 : 3; // G is Column G (Index 6), D is Column D (Index 3)
        nameSuffix = "-MYNTRA";
    } else if (splitMode === "2") {
        headerRows = 2;
        dataStartRow = 3;
        filterField = 3; // Column D is Index 3
        nameSuffix = " DETAILS SHEET MYNTRA";
    } else if (splitMode === "3") {
        headerRows = 2;
        dataStartRow = 3;
        filterField = 6; // Column G is Index 6
        nameSuffix = " SUMMARY SHEET MYNTRA";
    } else if (splitMode === "4") {
        headerRows = 1;
        dataStartRow = 2;
        filterField = 0; // Column A is Index 0
        nameSuffix = "";
    }

    sepGroups = new Map();
    sepUniqueValues = [];

    // Loop through data rows
    for (let r = dataStartRow - 1; r < sepParsedAOA.length; r++) {
        const row = sepParsedAOA[r];
        if (!row) continue;
        
        const rawVal = row[filterField];
        const cleanVal = cleanCell(rawVal).trim();
        
        if (cleanVal === "" || cleanVal.toLowerCase() === "warehouse code/name" || cleanVal.toLowerCase() === "party code" || cleanVal.toLowerCase() === "state code") {
            continue; // Skip blanks or duplicate header rows
        }

        if (!sepGroups.has(cleanVal)) {
            sepGroups.set(cleanVal, []);
            sepUniqueValues.push(cleanVal);
        }
        sepGroups.get(cleanVal).push(row);
    }

    // Sort unique values alphabetically
    sepUniqueValues.sort();

    renderSeparatePreview(headerRows, nameSuffix, splitMode);
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

// Render the separate preview table
function renderSeparatePreview(headerRows, nameSuffix, splitMode) {
    const sepUniqueCount = document.getElementById('sep-unique-count');
    const sepPreviewTbody = document.getElementById('sep-preview-tbody');
    const sepEmptyState = document.getElementById('sep-empty-state');
    const sepTableContainer = document.getElementById('sep-table-container');
    const btnSplitRun = document.getElementById('btn-split-run');

    sepUniqueCount.textContent = `${sepUniqueValues.length} unique values found`;
    sepPreviewTbody.innerHTML = '';

    if (sepUniqueValues.length === 0) {
        sepEmptyState.classList.remove('hidden');
        sepTableContainer.classList.add('hidden');
        btnSplitRun.classList.add('hidden');
        return;
    }

    sepEmptyState.classList.add('hidden');
    sepTableContainer.classList.remove('hidden');
    btnSplitRun.classList.remove('hidden');

    const dtStampPlaceholder = getDtStamp(); // Static timestamp for display

    sepUniqueValues.forEach((val, idx) => {
        const rows = sepGroups.get(val);
        let outputName = "";
        
        if (splitMode === "4") {
            const firstNum = val.split('-')[0] || val;
            outputName = `${firstNum}-Tax-${val}-MYNTYRA`;
        } else {
            outputName = `${val}${nameSuffix}`;
        }
        
        // Clean name
        outputName = cleanFileNameString(outputName);
        const displayFilename = `${outputName} ${dtStampPlaceholder}_${String(idx + 1).padStart(2, '0')}.xlsx`;

        const tr = document.createElement('tr');
        tr.className = `row-color-${idx % 7}`;
        tr.innerHTML = `
            <td><strong>${idx + 1}</strong></td>
            <td><span style="font-family: monospace; font-weight: 700; color: var(--text-primary);">${val}</span></td>
            <td><span class="badge badge-od">${rows.length} rows</span></td>
            <td><span style="color: var(--primary); font-weight: 500; font-size: 0.8rem;">${displayFilename}</span></td>
        `;
        sepPreviewTbody.appendChild(tr);
    });
}

// Run the split and compile process
async function runSeparateProcess() {
    if (!sepParsedAOA || sepUniqueValues.length === 0) return;

    const btnSplitRun = document.getElementById('btn-split-run');

    // If ZIP is already generated in state, download it immediately
    if (sepGeneratedZipBlob) {
        const url = URL.createObjectURL(sepGeneratedZipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = sepGeneratedZipName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);

        showToast("ZIP downloaded successfully!", "success");
        return;
    }

    const splitModeInput = document.querySelector('input[name="split-mode"]:checked');
    const splitMode = splitModeInput ? splitModeInput.value : "1";
    
    const sepProgress = document.getElementById('sep-progress');
    const sepProgressPercent = document.getElementById('sep-progress-percent');
    const sepProgressText = document.getElementById('sep-progress-text');
    const sepProgressFill = document.getElementById('sep-progress-fill');

    // Disable split run button and show progress indicator
    btnSplitRun.disabled = true;
    sepProgress.classList.remove('hidden');

    const updateSepProgress = (percent, text) => {
        sepProgressPercent.textContent = `${Math.round(percent)}%`;
        sepProgressFill.style.width = `${percent}%`;
        if (text) sepProgressText.textContent = text;
    };

    updateSepProgress(5, "Preparing split pipeline...");
    await new Promise(r => setTimeout(r, 50));

    try {
        let headerRows = 2;
        let nameSuffix = "-MYNTRA";

        if (splitMode === "1") {
            headerRows = 2;
            nameSuffix = "-MYNTRA";
        } else if (splitMode === "2") {
            headerRows = 2;
            nameSuffix = " DETAILS SHEET MYNTRA";
        } else if (splitMode === "3") {
            headerRows = 2;
            nameSuffix = " SUMMARY SHEET MYNTRA";
        } else if (splitMode === "4") {
            headerRows = 1;
            nameSuffix = "";
        }

        const headers = sepParsedAOA.slice(0, headerRows);
        const dtStamp = getDtStamp();
        const zip = new JSZip();

        for (let i = 0; i < sepUniqueValues.length; i++) {
            const val = sepUniqueValues[i];
            const dataRows = sepGroups.get(val);
            
            const fileProgress = 5 + Math.round((i / sepUniqueValues.length) * 85);
            updateSepProgress(fileProgress, `Packaging file: ${val} (${i + 1}/${sepUniqueValues.length})...`);
            await new Promise(r => setTimeout(r, 20));

            // Combine headers and values
            const outputRows = [...headers, ...dataRows];

            // Build new workbook using SheetJS
            const ws = XLSX.utils.aoa_to_sheet(outputRows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
            
            const arrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

            // Generate filename
            let outputName = "";
            if (splitMode === "4") {
                const firstNum = val.split('-')[0] || val;
                outputName = `${firstNum}-Tax-${val}-MYNTYRA`;
            } else {
                outputName = `${val}${nameSuffix}`;
            }

            outputName = cleanFileNameString(outputName);
            const finalName = `${outputName} ${dtStamp}_${String(i + 1).padStart(2, '0')}.xlsx`;

            const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            zip.file(finalName, blob);
        }

        updateSepProgress(92, "Generating ZIP package...");
        await new Promise(r => setTimeout(r, 50));

        // Save generated ZIP details in state variables instead of direct download trigger
        sepGeneratedZipBlob = await zip.generateAsync({ type: "blob" });
        const sepModeInput = document.querySelector('input[name="split-mode"]:checked');
        const sepModeVal = sepModeInput ? sepModeInput.value : "1";
        const sepZipNames = {
            "1": "myntra_simple_seprate_bundle.zip",
            "2": "myntra_details_seprate_bundle.zip",
            "3": "myntra_summary_seprate_bundle.zip",
            "4": "myntra_tax_seprate_bundle.zip"
        };
        sepGeneratedZipName = sepZipNames[sepModeVal] || `${sepFileNamePrefix}_Separated.zip`;

        updateSepProgress(100, "Success!");
        showToast("Files split successfully! Click Download ZIP to save.", "success");

        setTimeout(() => {
            sepProgress.classList.add('hidden');
            sepProgressPercent.textContent = "0%";
            sepProgressFill.style.width = "0%";
            sepProgressText.textContent = "Splitting files...";
            
            // Transform button to download action state
            btnSplitRun.disabled = false;
            btnSplitRun.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Download Separated ZIP
            `;
            btnSplitRun.style.background = "var(--color-od)";
            btnSplitRun.style.borderColor = "var(--color-od)";
        }, 1200);

    } catch (err) {
        console.error(err);
        showToast("Error splitting files: " + err.message, "error");
        sepProgress.classList.add('hidden');
        btnSplitRun.disabled = false;
    }
}

// Helper to extract valid spreadsheet files from a ZIP Blob
async function extractSpreadsheetsFromZip(zipFile) {
    const zip = await JSZip.loadAsync(zipFile);
    const promises = [];
    const filesFound = [];
    
    // Extract digits from zip filename (e.g. "139.zip" -> "139", "INDO_139_PR.zip" -> "139")
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
                    
                    // Construct a virtual path for grouping if needed
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
let renUploadedFiles = []; // Array of { id, name, fileObj, ext, renameCode, renamedName, p2Value, colGValue }
let renGeneratedZipBlob = null;
let renGeneratedZipName = "";
let renNextId = 1;

function setupRenameFile() {
    const renDropzone = document.getElementById('ren-dropzone');
    const renFileInput = document.getElementById('ren-file-input');
    const btnRenameRun = document.getElementById('btn-rename-run');
    
    if (!renDropzone || !renFileInput) return;

    // Dropzone Click
    renDropzone.addEventListener('click', () => {
        renFileInput.click();
    });

    // File selection
    renFileInput.addEventListener('change', (e) => {
        handleRenFileSelection(e.target.files);
    });

    // Drag & Drop
    renDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        renDropzone.classList.add('dragover');
    });

    renDropzone.addEventListener('dragleave', () => {
        renDropzone.classList.remove('dragover');
    });

    renDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        renDropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleRenFileSelection(e.dataTransfer.files);
        }
    });

    // Radio button event listeners for rename method choice
    document.querySelectorAll('input[name="ren-method"]').forEach(radio => {
        radio.addEventListener('change', () => {
            resetRenameButtonState();
            if (renUploadedFiles.length > 0) {
                calculateRenameResults();
            }
        });
    });

    // Run Rename Trigger
    btnRenameRun.addEventListener('click', runRenameProcess);
}

// Reset the rename button back to Rename Files action state
function resetRenameButtonState() {
    renGeneratedZipBlob = null;
    renGeneratedZipName = "";
    const btnRenameRun = document.getElementById('btn-rename-run');
    if (btnRenameRun) {
        btnRenameRun.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            Rename Files
        `;
        btnRenameRun.style.background = ""; // Restore default style
        btnRenameRun.style.borderColor = "";
    }
    const renFileLabel = document.getElementById('ren-file-label');
    if (renFileLabel) {
        renFileLabel.textContent = "Drag & Drop files here";
    }
}

// Handle selected rename files
async function handleRenFileSelection(files) {
    resetRenameButtonState();
    if (!files || files.length === 0) return;

    const renDropzone = document.getElementById('ren-dropzone');
    const renProgress = document.getElementById('ren-progress');
    const renProgressPercent = document.getElementById('ren-progress-percent');
    const renProgressText = document.getElementById('ren-progress-text');
    const renProgressFill = document.getElementById('ren-progress-fill');

    // Show inline progress box
    renProgress.classList.remove('hidden');
    const updateRenProgress = (percent, text) => {
        renProgressPercent.textContent = `${Math.round(percent)}%`;
        renProgressFill.style.width = `${percent}%`;
        if (text) renProgressText.textContent = text;
    };

    updateRenProgress(5, "Reading uploaded files...");
    
    // Clear previous files list
    renUploadedFiles = [];
    renNextId = 1;

    try {
        // Build flat list of files (resolving any ZIP files)
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
            renProgress.classList.add('hidden');
            showToast("No valid Excel or CSV files found.", "error");
            return;
        }

        // Update the file label text on screen
        const renFileLabel = document.getElementById('ren-file-label');
        if (renFileLabel) {
            renFileLabel.textContent = `${flatFilesList.length} files loaded`;
        }

        for (let i = 0; i < flatFilesList.length; i++) {
            const fileData = flatFilesList[i];
            const fileProgress = 10 + Math.round((i / flatFilesList.length) * 80);
            updateRenProgress(fileProgress, `Parsing: ${fileData.name}...`);
            await new Promise(r => setTimeout(r, 10));

            const fileObj = {
                id: renNextId++,
                name: fileData.name,
                fileObj: fileData.blob,
                ext: fileData.ext,
                p2Value: "",
                colGValue: "",
                renameCode: "",
                renamedName: ""
            };

            // Parse AOA spreadsheet structure to extract G/P2 values in background
            const aoa = await readExcelAsAOA(fileData.blob);
            
            // Extract P2 value: row index 1, column index 15 (Column P)
            let p2Val = "";
            if (aoa.length > 1 && aoa[1] && aoa[1][15] !== undefined) {
                p2Val = String(aoa[1][15]).trim();
            }

            // Extract Column G value: column index 6, rows starting index 1, skip CGJ1-
            let colGVal = "";
            for (let r = 1; r < aoa.length; r++) {
                const row = aoa[r];
                if (row && row[6] !== undefined) {
                    const val = String(row[6]).trim();
                    if (val !== "" && !val.toUpperCase().startsWith("CGJ1-")) {
                        colGVal = val;
                        break;
                    }
                }
            }

            fileObj.p2Value = p2Val;
            fileObj.colGValue = colGVal;
            renUploadedFiles.push(fileObj);
        }

        updateRenProgress(95, "Resolving codes...");
        await new Promise(r => setTimeout(r, 20));

        calculateRenameResults();

        updateRenProgress(100, "Done!");
        showToast(`${renUploadedFiles.length} files loaded for renaming!`, "success");
        
        setTimeout(() => {
            renProgress.classList.add('hidden');
            renProgressPercent.textContent = "0%";
            renProgressFill.style.width = "0%";
            renProgressText.textContent = "Processing rename...";
        }, 1200);

    } catch (err) {
        console.error(err);
        showToast("Error reading files: " + err.message, "error");
        renProgress.classList.add('hidden');
    }
}

// Calculate Rename codes & names based on selected Method
function calculateRenameResults() {
    if (renUploadedFiles.length === 0) return;

    const methodInput = document.querySelector('input[name="ren-method"]:checked');
    const useP2Method = methodInput ? (methodInput.value === "yes") : true;

    const usedNames = new Set();

    renUploadedFiles.forEach(fileObj => {
        let renameCode = "";

        if (useP2Method) {
            // OPTION A: P2 Value direct database match or fallback
            if (fileObj.p2Value !== "") {
                const findName = fileObj.p2Value.toUpperCase().replace(/[\s\-_.]/g, "");
                let partyCodeMatch = "";

                // Loop through Google sheet synced party data
                for (let i = 0; i < partyData.length; i++) {
                    const item = partyData[i];
                    if (item.partyCode) {
                        const arrName = item.partyCode.toUpperCase().replace(/[\s\-_.]/g, "");
                        if (arrName.indexOf(findName) !== -1 || findName.indexOf(arrName) !== -1) {
                            partyCodeMatch = String(item.code).trim();
                            break;
                        }
                    }
                }

                if (partyCodeMatch !== "") {
                    renameCode = partyCodeMatch;
                } else {
                    renameCode = fileObj.p2Value; // Fallback to raw P2
                }
            }
        } else {
            // OPTION B: Column G cell extraction
            if (fileObj.colGValue !== "") {
                const firstPart = fileObj.colGValue.split('-')[0].trim();
                renameCode = firstPart.slice(-3); // Right 3 characters of first hyphen part
            }
        }

        if (renameCode !== "") {
            const ext = `.${fileObj.ext}`;
            const baseName = fileObj.name.substring(0, fileObj.name.lastIndexOf('.')) || fileObj.name;
            
            // Format: renameCode-oldName.ext
            let targetName = `${renameCode}-${baseName}${ext}`;

            // Duplicate collision handling (e.g. adding suffix indices (1), (2), etc.)
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

    renderRenamePreview();
}

// Render preview list
function renderRenamePreview() {
    const renFileCount = document.getElementById('ren-file-count');
    const renPreviewTbody = document.getElementById('ren-preview-tbody');
    const renEmptyState = document.getElementById('ren-empty-state');
    const renTableContainer = document.getElementById('ren-table-container');
    const btnRenameRun = document.getElementById('btn-rename-run');

    renFileCount.textContent = `${renUploadedFiles.length} files loaded`;
    renPreviewTbody.innerHTML = '';

    if (renUploadedFiles.length === 0) {
        renEmptyState.classList.remove('hidden');
        renTableContainer.classList.add('hidden');
        btnRenameRun.classList.add('hidden');
        return;
    }

    renEmptyState.classList.add('hidden');
    renTableContainer.classList.remove('hidden');
    btnRenameRun.classList.remove('hidden');

    renUploadedFiles.forEach((file, idx) => {
        const tr = document.createElement('tr');
        tr.className = `row-color-${idx % 7}`;
        
        let codeBadgeClass = "badge-unmatched";
        if (file.renameCode !== "Not Found") {
            codeBadgeClass = "badge-od";
        }

        tr.innerHTML = `
            <td><strong>${idx + 1}</strong></td>
            <td><span class="file-name" title="${file.name}">${file.name}</span></td>
            <td><span class="badge ${codeBadgeClass}">${file.renameCode}</span></td>
            <td><span style="color: var(--primary); font-weight: 500; font-size: 0.8rem;">${file.renamedName}</span></td>
        `;
        renPreviewTbody.appendChild(tr);
    });
}

// Run the rename split package download
async function runRenameProcess() {
    if (renUploadedFiles.length === 0) return;

    const btnRenameRun = document.getElementById('btn-rename-run');

    // If already generated, download directly
    if (renGeneratedZipBlob) {
        const url = URL.createObjectURL(renGeneratedZipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = renGeneratedZipName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);

        showToast("ZIP downloaded successfully!", "success");
        return;
    }

    const renProgress = document.getElementById('ren-progress');
    const renProgressPercent = document.getElementById('ren-progress-percent');
    const renProgressText = document.getElementById('ren-progress-text');
    const renProgressFill = document.getElementById('ren-progress-fill');

    btnRenameRun.disabled = true;
    renProgress.classList.remove('hidden');

    const updateRenProgress = (percent, text) => {
        renProgressPercent.textContent = `${Math.round(percent)}%`;
        renProgressFill.style.width = `${percent}%`;
        if (text) renProgressText.textContent = text;
    };

    updateRenProgress(10, "Packaging renamed files...");
    await new Promise(r => setTimeout(r, 50));

    try {
        const zip = new JSZip();

        for (let i = 0; i < renUploadedFiles.length; i++) {
            const file = renUploadedFiles[i];
            const fileProgress = 10 + Math.round((i / renUploadedFiles.length) * 80);
            updateRenProgress(fileProgress, `Adding to ZIP: ${file.renamedName}...`);
            await new Promise(r => setTimeout(r, 15));

            zip.file(file.renamedName, file.fileObj);
        }

        updateRenProgress(95, "Generating ZIP container...");
        await new Promise(r => setTimeout(r, 50));

        renGeneratedZipBlob = await zip.generateAsync({ type: "blob" });
        const renMethodInput = document.querySelector('input[name="ren-method"]:checked');
        const isP2Method = renMethodInput ? (renMethodInput.value === "yes") : true;
        renGeneratedZipName = isP2Method ? `myntra_order_rename_file.zip` : `myntra_tax_rename_file.zip`;

        updateRenProgress(100, "Success!");
        showToast("Files renamed successfully! Click Download ZIP to save.", "success");

        setTimeout(() => {
            renProgress.classList.add('hidden');
            renProgressPercent.textContent = "0%";
            renProgressFill.style.width = "0%";
            renProgressText.textContent = "Processing rename...";
            
            // Switch button to download state
            btnRenameRun.disabled = false;
            btnRenameRun.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Download Renamed ZIP
            `;
            btnRenameRun.style.background = "var(--color-od)";
            btnRenameRun.style.borderColor = "var(--color-od)";
        }, 1200);

    } catch (err) {
        console.error(err);
        showToast("Error generating zip: " + err.message, "error");
        renProgress.classList.add('hidden');
        btnRenameRun.disabled = false;
    }
}

// ==========================================
// MERGE FILE TAB OPERATIONS
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

function setupMergeFile() {
    const mrgDropzone = document.getElementById('mrg-dropzone');
    const mrgFileInput = document.getElementById('mrg-file-input');
    const btnMergeRun = document.getElementById('btn-merge-run');
    
    if (!mrgDropzone || !mrgFileInput) return;

    // Dropzone Click
    mrgDropzone.addEventListener('click', () => {
        mrgFileInput.click();
    });

    // File selection
    mrgFileInput.addEventListener('change', (e) => {
        handleMrgFileSelection(e.target.files);
    });

    // Drag & Drop
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

    // Run Merge Trigger
    btnMergeRun.addEventListener('click', runMergeProcess);
}

// Reset the merge button back to Merge Files action state
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
        btnMergeRun.style.background = ""; // Restore default style
        btnMergeRun.style.borderColor = "";
    }
    const mrgFileLabel = document.getElementById('mrg-file-label');
    if (mrgFileLabel) {
        mrgFileLabel.textContent = "Drag & Drop files here";
    }
}

// Handle selected merge files
async function handleMrgFileSelection(files) {
    resetMergeButtonState();
    if (!files || files.length === 0) return;

    const mrgProgress = document.getElementById('mrg-progress');
    const mrgProgressPercent = document.getElementById('mrg-progress-percent');
    const mrgProgressText = document.getElementById('mrg-progress-text');
    const mrgProgressFill = document.getElementById('mrg-progress-fill');

    // Show inline progress box
    mrgProgress.classList.remove('hidden');
    const updateMrgProgress = (percent, text) => {
        mrgProgressPercent.textContent = `${Math.round(percent)}%`;
        mrgProgressFill.style.width = `${percent}%`;
        if (text) mrgProgressText.textContent = text;
    };

    updateMrgProgress(5, "Reading uploaded files...");
    
    // Clear previous files list
    mrgUploadedFiles = [];
    mrgNextId = 1;

    try {
        // Build flat list of files (resolving any ZIP files)
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
            mrgProgress.classList.add('hidden');
            showToast("No valid Excel or CSV files found.", "error");
            return;
        }

        // Update the file label text on screen
        const mrgFileLabel = document.getElementById('mrg-file-label');
        if (mrgFileLabel) {
            mrgFileLabel.textContent = `${flatFilesList.length} files loaded`;
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

        // Perform prefix grouping
        mrgGroupsMap = new Map();
        mrgUniqueGroups = [];

        mrgUploadedFiles.forEach(fileObj => {
            const key = fileObj.groupKey;
            if (!mrgGroupsMap.has(key)) {
                mrgGroupsMap.set(key, []);
                mrgUniqueGroups.push(key);
            }
            mrgGroupsMap.get(key).push(fileObj);
        });

        // Sort groups alphabetically
        mrgUniqueGroups.sort();

        renderMergePreview();

        updateMrgProgress(100, "Done!");
        showToast(`${mrgUploadedFiles.length} files loaded for merging!`, "success");
        
        setTimeout(() => {
            mrgProgress.classList.add('hidden');
            mrgProgressPercent.textContent = "0%";
            mrgProgressFill.style.width = "0%";
            mrgProgressText.textContent = "Processing merge...";
        }, 1200);

    } catch (err) {
        console.error(err);
        showToast("Error reading files: " + err.message, "error");
        mrgProgress.classList.add('hidden');
    }
}

// Render preview list
function renderMergePreview() {
    const mrgGroupCount = document.getElementById('mrg-group-count');
    const mrgPreviewTbody = document.getElementById('mrg-preview-tbody');
    const mrgEmptyState = document.getElementById('mrg-empty-state');
    const mrgTableContainer = document.getElementById('mrg-table-container');
    const btnMergeRun = document.getElementById('btn-merge-run');

    mrgGroupCount.textContent = `${mrgUniqueGroups.length} groups detected`;
    mrgPreviewTbody.innerHTML = '';

    if (mrgUniqueGroups.length === 0) {
        mrgEmptyState.classList.remove('hidden');
        mrgTableContainer.classList.add('hidden');
        btnMergeRun.classList.add('hidden');
        return;
    }

    mrgEmptyState.classList.add('hidden');
    mrgTableContainer.classList.remove('hidden');
    btnMergeRun.classList.remove('hidden');

    mrgUniqueGroups.forEach((key, idx) => {
        const filesInGroup = mrgGroupsMap.get(key);
        const sourceNames = filesInGroup.map(f => f.name).join(', ');
        
        // Output format: [key]-DropShipOrderReports-MYNTRA-[key].xlsx
        const outputFilename = `${key}-DropShipOrderReports-MYNTRA-${key}.xlsx`;

        const tr = document.createElement('tr');
        tr.className = `row-color-${idx % 7}`;
        
        tr.innerHTML = `
            <td><strong>${idx + 1}</strong></td>
            <td><span class="badge badge-dt">${key}</span></td>
            <td><span class="file-name" title="${sourceNames}">${filesInGroup.length} files (${sourceNames})</span></td>
            <td><span style="color: var(--primary); font-weight: 500; font-size: 0.8rem;">${outputFilename}</span></td>
        `;
        mrgPreviewTbody.appendChild(tr);
    });
}

// Run the merge and download process
async function runMergeProcess() {
    if (mrgUniqueGroups.length === 0) return;

    const btnMergeRun = document.getElementById('btn-merge-run');

    // If already generated, download directly
    if (mrgSingleFileBlob) {
        // Download single merged file directly
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
        // Download zipped multiple merged files
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

    btnMergeRun.disabled = true;
    mrgProgress.classList.remove('hidden');

    const updateMrgProgress = (percent, text) => {
        mrgProgressPercent.textContent = `${Math.round(percent)}%`;
        mrgProgressFill.style.width = `${percent}%`;
        if (text) mrgProgressText.textContent = text;
    };

    updateMrgProgress(10, "Merging file groups...");
    await new Promise(r => setTimeout(r, 50));

    try {
        const zip = new JSZip();

        for (let i = 0; i < mrgUniqueGroups.length; i++) {
            const key = mrgUniqueGroups[i];
            const filesInGroup = mrgGroupsMap.get(key);
            
            const fileProgress = 10 + Math.round((i / mrgUniqueGroups.length) * 80);
            updateMrgProgress(fileProgress, `Merging group: ${key} (${i + 1}/${mrgUniqueGroups.length})...`);
            await new Promise(r => setTimeout(r, 20));

            const mergedRows = [];
            let headerWritten = false;

            for (let fIdx = 0; fIdx < filesInGroup.length; fIdx++) {
                const file = filesInGroup[fIdx];
                const aoa = file.aoa || [];
                
                if (aoa.length === 0) continue;

                if (!headerWritten) {
                    // First non-empty file: Copy everything (headers + data rows)
                    for (let r = 0; r < aoa.length; r++) {
                        mergedRows.push([...aoa[r]]);
                    }
                    headerWritten = true;
                } else {
                    // Subsequent files: Copy starting from row index 1 (skipping header row)
                    if (aoa.length > 1) {
                        for (let r = 1; r < aoa.length; r++) {
                            mergedRows.push([...aoa[r]]);
                        }
                    }
                }
            }

            // Build new workbook using SheetJS
            const ws = XLSX.utils.aoa_to_sheet(mergedRows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
            
            const arrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const fileBlob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            const outputName = `${key}-DropShipOrderReports-MYNTRA-${key}.xlsx`;

            if (mrgUniqueGroups.length === 1) {
                // If only 1 group, save as single Excel directly
                mrgSingleFileBlob = fileBlob;
                mrgSingleFileName = outputName;
            } else {
                // If multiple groups, add to ZIP
                zip.file(outputName, fileBlob);
            }
        }

        updateMrgProgress(95, "Generating output package...");
        await new Promise(r => setTimeout(r, 50));

        let isSingle = (mrgUniqueGroups.length === 1);
        if (!isSingle) {
            mrgGeneratedZipBlob = await zip.generateAsync({ type: "blob" });
            mrgGeneratedZipName = "ajio_murge_file.zip";
        }

        updateMrgProgress(100, "Success!");
        showToast("Files merged successfully! Click Download to save.", "success");

        setTimeout(() => {
            mrgProgress.classList.add('hidden');
            mrgProgressPercent.textContent = "0%";
            mrgProgressFill.style.width = "0%";
            mrgProgressText.textContent = "Processing merge...";
            
            // Switch button to download state
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
        }, 1200);

    } catch (err) {
        console.error(err);
        showToast("Error merging files: " + err.message, "error");
        mrgProgress.classList.add('hidden');
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
                fldUploadedFiles.splice(index, 1);
                updateFldSelectedUI();
                recalculateFldGroupsAndPreview();
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

function recalculateFldGroupsAndPreview() {
    const fldEmptyState = document.getElementById('fld-empty-state');
    const fldTableContainer = document.getElementById('fld-table-container');
    const fldPreviewTbody = document.getElementById('fld-preview-tbody');
    const fldFileCount = document.getElementById('fld-file-count');
    const btnFldRun = document.getElementById('btn-fld-run');
    
    if (fldUploadedFiles.length === 0) {
        if (fldEmptyState) fldEmptyState.classList.remove('hidden');
        if (fldTableContainer) fldTableContainer.classList.add('hidden');
        if (fldFileCount) fldFileCount.textContent = '0 files loaded';
        if (btnFldRun) btnFldRun.classList.add('hidden');
        return;
    }
    
    if (fldFileCount) {
        fldFileCount.textContent = `${fldUploadedFiles.length} files loaded`;
    }
    
    const groups = new Map();
    
    if (fldMode === 'files') {
        fldUploadedFiles.forEach(fileData => {
            const name = fileData.name;
            if (name.includes("-")) {
                const prefix = name.split("-")[0].trim();
                if (prefix !== "") {
                    if (!groups.has(prefix)) {
                        groups.set(prefix, []);
                    }
                    groups.get(prefix).push(fileData);
                }
            }
        });
    } else {
        fldUploadedFiles.forEach(fileData => {
            const folderName = fileData.folderName;
            if (folderName) {
                if (!groups.has(folderName)) {
                    groups.set(folderName, []);
                }
                groups.get(folderName).push(fileData);
            }
        });
    }
    
    let html = "";
    let index = 1;
    const sortedPrefixes = Array.from(groups.keys()).sort();
    
    sortedPrefixes.forEach(prefix => {
        const filesInGroup = groups.get(prefix);
        const count = filesInGroup.length;
        const missingCount = count < 3 ? (3 - count) : 0;
        
        let statusBadge = "";
        if (count >= 3) {
            statusBadge = `<span class="badge success" style="background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 2px 8px; border-radius: 4px; font-weight: 500; font-size: 0.7rem;">3+ Files (Complete)</span>`;
        } else {
            statusBadge = `<span class="badge danger" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 2px 8px; border-radius: 4px; font-weight: 500; font-size: 0.7rem;">${count} Files (${missingCount} Missing)</span>`;
        }
        
        const filesStr = filesInGroup.map(f => f.name).join(", ");
        
        html += `
            <tr>
                <td>${index++}</td>
                <td style="font-weight: 600;">${prefix}</td>
                <td>${count}</td>
                <td>${statusBadge}</td>
                <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${filesStr}">${filesStr}</td>
            </tr>
        `;
    });
    
    if (fldPreviewTbody) {
        fldPreviewTbody.innerHTML = html;
    }
    
    if (fldEmptyState) fldEmptyState.classList.add('hidden');
    if (fldTableContainer) fldTableContainer.classList.remove('hidden');
    if (btnFldRun) btnFldRun.classList.remove('hidden');
}

function setupFolderCreate() {
    const fldDropzone = document.getElementById('fld-dropzone');
    const fldFileInput = document.getElementById('fld-file-input');
    const fldFolderInput = document.getElementById('fld-folder-input');
    const btnFldSelectFiles = document.getElementById('btn-fld-select-files');
    const btnFldRun = document.getElementById('btn-fld-run');
    const btnFldClear = document.getElementById('btn-fld-clear');
    
    const fldModeFilesBtn = document.getElementById('fld-mode-files-btn');
    const fldModeFoldersBtn = document.getElementById('fld-mode-folders-btn');
    
    if (!fldDropzone || !fldFileInput || !btnFldRun) return;
    
    // Switch buttons setup
    if (fldModeFilesBtn) {
        fldModeFilesBtn.addEventListener('click', () => switchFldMode('files'));
    }
    if (fldModeFoldersBtn) {
        fldModeFoldersBtn.addEventListener('click', () => switchFldMode('folders'));
    }
    
    // Clear button setup
    if (btnFldClear) {
        btnFldClear.addEventListener('click', () => {
            fldUploadedFiles = [];
            if (fldFileInput) fldFileInput.value = '';
            if (fldFolderInput) fldFolderInput.value = '';
            resetFolderCreateButtonState();
            updateFldSelectedUI();
            recalculateFldGroupsAndPreview();
            showToast("Cleared selected files list", "success");
        });
    }
    
    // Select Files/Folder click trigger
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
    
    fldDropzone.addEventListener('click', (e) => {
        if (e.target.closest('#btn-fld-select-files')) return;
        if (fldMode === 'files') {
            fldFileInput.click();
        } else {
            if (fldFolderInput) fldFolderInput.click();
        }
    });
    
    fldFileInput.addEventListener('change', (e) => {
        handleFldFileSelection(e.target.files);
    });
    
    if (fldFolderInput) {
        fldFolderInput.addEventListener('change', (e) => {
            handleFldFileSelection(e.target.files);
        });
    }
    
    // Drag & Drop
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
    
    // Run process
    btnFldRun.addEventListener('click', runFolderCreateProcess);
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
        btnFldRun.style.background = ""; // Restore default style
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
            
            // Skip system files
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
        // Add to our list avoiding duplicates
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
        
        const groups = new Map();
        
        if (fldMode === 'files') {
            fldUploadedFiles.forEach(fileObj => {
                const name = fileObj.name;
                if (name.includes("-")) {
                    const prefix = name.split("-")[0].trim();
                    if (prefix !== "") {
                        if (!groups.has(prefix)) {
                            groups.set(prefix, []);
                        }
                        groups.get(prefix).push(fileObj);
                    }
                }
            });
        } else {
            fldUploadedFiles.forEach(fileObj => {
                const folderName = fileObj.folderName;
                if (folderName) {
                    if (!groups.has(folderName)) {
                        groups.set(folderName, []);
                    }
                    groups.get(folderName).push(fileObj);
                }
            });
        }
        
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
        
        // Build Excel Summary (Myntra Group check = 3 files)
        const summaryAOA = [
            ["Folder Creation & Completeness Report"],
            ["Folder Name", "Current File Count", "Missing Files Count", "Status"]
        ];
        
        const missingList = [];
        sortedPrefixes.forEach(prefix => {
            const filesInGroup = groups.get(prefix);
            const count = filesInGroup.length;
            const missingCount = count < 3 ? (3 - count) : 0;
            const status = count >= 3 ? "Complete" : `Missing ${missingCount} File(s)`;
            summaryAOA.push([prefix, count, missingCount, status]);
            if (missingCount > 0) {
                missingList.push({ prefix, count, missingCount });
            }
        });
        
        const summaryWS = XLSX.utils.aoa_to_sheet(summaryAOA);
        summaryWS['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
        summaryWS['!views'] = [{ showGridLines: true }];
        
        const colWidths = [
            { wch: 25 }, // Folder Name
            { wch: 20 }, // Current File Count
            { wch: 20 }, // Missing Files Count
            { wch: 22 }  // Status
        ];
        summaryWS['!cols'] = colWidths;
        
        const rowHeights = [
            { hpt: 28 }, // Title Row
            { hpt: 24 }  // Header Row
        ];
        for (let r = 2; r < summaryAOA.length; r++) {
            rowHeights.push({ hpt: 20 });
        }
        summaryWS['!rows'] = rowHeights;
        
        // Style cells
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
                    cell.s.fill = { fgColor: { rgb: "4C1D95" } };
                    cell.s.font = { name: "Arial", sz: 12, bold: true, color: { rgb: "FFFFFF" } };
                    cell.s.alignment = { horizontal: "center", vertical: "center" };
                } else if (rowNum === 2) {
                    cell.s.fill = { fgColor: { rgb: "6D28D9" } };
                    cell.s.font = { name: "Arial", sz: 10, bold: true, color: { rgb: "FFFFFF" } };
                    cell.s.alignment = { horizontal: "center", vertical: "center" };
                } else {
                    cell.s.font = { name: "Arial", sz: 10, color: { rgb: "000000" } };
                    if (colIndex === 0) {
                        cell.s.alignment = { horizontal: "left", vertical: "center" };
                    } else {
                        cell.s.alignment = { horizontal: "center", vertical: "center" };
                    }
                    
                    const rowData = summaryAOA[rowNum - 1];
                    const currentCount = rowData[1];
                    if (currentCount < 3) {
                        cell.s.fill = { fgColor: { rgb: "FEE2E2" } };
                        cell.s.font.color = { rgb: "991B1B" };
                    }
                }
            }
        }
        
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
                    zip.file(fileObj.relativePath, fileObj.fileObj);
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
        const isMyntra = record.type === 'myntra';
        const sourceBadge = isMyntra 
            ? `<span style="background: rgba(0, 150, 199, 0.08); color: #0096c7; border: 1px solid rgba(0, 150, 199, 0.15); padding: 0.2rem 0.45rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">MYNTRA ERROR</span>`
            : `<span style="background: rgba(123, 44, 191, 0.08); color: var(--primary); border: 1px solid rgba(123, 44, 191, 0.15); padding: 0.2rem 0.45rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">INVOICE</span>`;

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
    const btnResetInvoiceError = document.getElementById('btn-reset-invoice-error');
    const btnResetErrorTracker = document.getElementById('btn-reset-error-tracker');

    if (btnResetProcessor) btnResetProcessor.addEventListener('click', resetProcessorTab);
    if (btnResetRename) btnResetRename.addEventListener('click', resetRenameTab);
    if (btnResetMerge) btnResetMerge.addEventListener('click', resetMergeTab);
    if (btnResetSeparate) btnResetSeparate.addEventListener('click', resetSeparateTab);
    if (btnResetFolderCreate) btnResetFolderCreate.addEventListener('click', resetFolderCreateTab);
    if (btnResetDatabase) btnResetDatabase.addEventListener('click', resetDatabaseTab);
    if (btnResetMyntraError) btnResetMyntraError.addEventListener('click', resetMyntraErrorTab);
    if (btnResetInvoiceError) btnResetInvoiceError.addEventListener('click', resetInvoiceErrorTab);
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
    renGeneratedZipBlob = null;
    renGeneratedZipName = "";

    const renFileInput = document.getElementById('ren-file-input');
    if (renFileInput) renFileInput.value = "";

    const renFileLabel = document.getElementById('ren-file-label');
    if (renFileLabel) renFileLabel.textContent = "Drag & Drop files here";

    const renFileCount = document.getElementById('ren-file-count');
    if (renFileCount) renFileCount.textContent = "0 files loaded";

    const renProgress = document.getElementById('ren-progress');
    if (renProgress) renProgress.classList.add('hidden');

    const renTableContainer = document.getElementById('ren-table-container');
    if (renTableContainer) renTableContainer.classList.add('hidden');

    const renEmptyState = document.getElementById('ren-empty-state');
    if (renEmptyState) renEmptyState.classList.remove('hidden');

    const renPreviewTbody = document.getElementById('ren-preview-tbody');
    if (renPreviewTbody) renPreviewTbody.innerHTML = "";

    const btnRenameRun = document.getElementById('btn-rename-run');
    if (btnRenameRun) {
        btnRenameRun.classList.add('hidden');
        btnRenameRun.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            Rename Files
        `;
        btnRenameRun.style.background = "";
        btnRenameRun.style.borderColor = "";
        btnRenameRun.disabled = false;
    }

    const defaultRadio = document.querySelector('input[name="ren-method"][value="yes"]');
    if (defaultRadio) defaultRadio.checked = true;

    showToast("Rename tab cleaned & reset.", "success");
}

function resetMergeTab() {
    mrgUploadedFiles = [];
    mrgGeneratedZipBlob = null;
    mrgGeneratedZipName = "";

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

    showToast("Merge tab cleaned & reset.", "success");
}

function resetSeparateTab() {
    sepUploadedFile = null;
    sepGeneratedZipBlob = null;
    sepGeneratedZipName = "";

    const sepFileInput = document.getElementById('sep-file-input');
    if (sepFileInput) sepFileInput.value = "";

    const sepFileLabel = document.getElementById('sep-file-label');
    if (sepFileLabel) sepFileLabel.textContent = "Upload Excel file to split";

    const sepUniqueCount = document.getElementById('sep-unique-count');
    if (sepUniqueCount) sepUniqueCount.textContent = "0 unique values";

    const sepProgress = document.getElementById('sep-progress');
    if (sepProgress) sepProgress.classList.add('hidden');

    const sepTableContainer = document.getElementById('sep-table-container');
    if (sepTableContainer) sepTableContainer.classList.add('hidden');

    const sepEmptyState = document.getElementById('sep-empty-state');
    if (sepEmptyState) sepEmptyState.classList.remove('hidden');

    const sepPreviewTbody = document.getElementById('sep-preview-tbody');
    if (sepPreviewTbody) sepPreviewTbody.innerHTML = "";

    const btnSplitRun = document.getElementById('btn-split-run');
    if (btnSplitRun) {
        btnSplitRun.classList.add('hidden');
        btnSplitRun.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="8" height="18" rx="2"></rect><rect x="14" y="3" width="8" height="18" rx="2"></rect></svg>
            Split File
        `;
        btnSplitRun.style.background = "";
        btnSplitRun.style.borderColor = "";
        btnSplitRun.disabled = false;
    }

    const defaultMode = document.querySelector('input[name="split-mode"][value="1"]');
    if (defaultMode) defaultMode.checked = true;
    const defaultCol = document.querySelector('input[name="simple-col"][value="D"]');
    if (defaultCol) defaultCol.checked = true;

    showToast("Separate tab cleaned & reset.", "success");
}

function resetFolderCreateTab() {
    fldUploadedFiles = [];
    fldGeneratedZipBlob = null;
    fldGeneratedZipName = "";

    const fldFileInput = document.getElementById('fld-file-input');
    const fldFolderInput = document.getElementById('fld-folder-input');
    if (fldFileInput) fldFileInput.value = "";
    if (fldFolderInput) fldFolderInput.value = "";

    const fldFileLabel = document.getElementById('fld-file-label');
    if (fldFileLabel) fldFileLabel.textContent = "Drag & Drop files here";

    const fldFileCount = document.getElementById('fld-file-count');
    if (fldFileCount) fldFileCount.textContent = "0 files loaded";

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

