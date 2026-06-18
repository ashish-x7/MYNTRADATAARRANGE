// State Management
let filesList = [];
let nextId = 1;
let isProcessed = false;
let partyData = [];
const appsScriptUrl = "https://script.google.com/macros/s/AKfycbwFfXErcIfmCvx8gEecvCFHVdiwIJPE1tSRkOjjU1b69i8JMUnfpRwGYXxvZHKk4Q8n/exec";
let editingPartyCode = null;
let uploadedZipBaseName = ""; // Tracks the original uploaded ZIP file name for download naming

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
    const gstRows = [["EE Invoice No", "Order Status", "Invoice Date", "Item Quantity", "Selling Price", "Item Price(Excluding Tax)"]];
    const gstCellStyles = {};
    let shadeIndex = 1;
    let gstCreated = false;
    
    for (let r = 1; r < filteredDtRows.length; r++) {
        const row = filteredDtRows[r] || [];
        const colG = cleanCell(row[6]); // Column G (Index 6)
        const colAp = cleanCell(row[41]); // Column AP (Index 41)
        
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
            
            // Apply highlights in original DT
            dtCellStyles[`${r},6`] = { fill: { fgColor: { rgb: "C8FFC8" } } };
            dtCellStyles[`${r},8`] = { fill: { fgColor: { rgb: "C8FFC8" } } };
            dtCellStyles[`${r},12`] = { fill: { fgColor: { rgb: "C8FFC8" } } };
            dtCellStyles[`${r},17`] = { fill: { fgColor: { rgb: "C8FFC8" } } };
            dtCellStyles[`${r},47`] = { fill: { fgColor: { rgb: "C8FFC8" } } };
            dtCellStyles[`${r},49`] = { fill: { fgColor: { rgb: "C8FFC8" } } };
            dtCellStyles[`${r},41`] = { fill: { fgColor: { rgb: "B4F0B4" } } };
            
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
        let zipName;
        if (isBatch) {
            zipName = uploadedZipBaseName ? `${uploadedZipBaseName} Processed.zip` : `${partyCodesArray.join('-')} Processed.zip`;
        } else {
            zipName = partyCodesArray[0] ? `${partyCodesArray[0]}.zip` : "Myntra_Processed_Files.zip";
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
        sepGeneratedZipName = `${sepFileNamePrefix}_Separated.zip`;

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
        renGeneratedZipName = `Renamed_Myntra_Sheets.zip`;

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
            mrgGeneratedZipName = "Merged_Myntra_Reports.zip";
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
        btnMergeRun.disabled = false;
    }
}


