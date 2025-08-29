const quill = new Quill('#editor', {
    theme: 'snow',
    placeholder: 'Enter details... (Max 27,000 characters)',
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link']
      ],
      mention: {
        allowedChars: /^[A-Za-z\s]*$/,
        mentionDenotationChars: ['@'],
        source: async function (searchTerm, renderList) 
        {
          try {
            console.log('Starting agent fetch with search term:', searchTerm);
  
            const raw = await ZOHODESK.request({
              url: 'https://desk.zoho.com/api/v1/agents?departmentId=4000000010045&from=1&limit=10&status=ACTIVE&isConfirmed=true&orgId=4241905&&searchStr=*'+searchTerm+'*',
              type: 'GET',
              connectionLinkName: 'userconnection',
              headers: {
                'Content-Type': 'application/json'
              },
              data: {},
              postBody: {}
            });
  
            console.log("Raw ZOHODESK response:");
            console.log(raw);
            const data = JSON.parse(JSON.parse(raw).response).statusMessage.data;
            console.log(data);
            if (!Array.isArray(data)) {
              throw new Error("Invalid data structure in response");
            }
  
            const filtered = data
            .filter(agent => {
              const name = agent.name || '';
              return name.toLowerCase().includes(searchTerm.toLowerCase());
            })
            .map(agent => {
              const agentId = agent.zuid || agent.id || '';
              const agentName = agent.name || 'Unknown';
              const avatar = agent.photoURL || '';
          
              console.log(`Matched Agent: ${agentName}, ID: ${agentId}`);
          
              return {
                id: agentId,
                value: agentName,
                avatar: avatar
              };
            });
          
            console.log('Filtered agents:', filtered);
            renderList(filtered);
          } catch (err) 
          {
            console.error('Error in agent fetch:', {
              error: err,
              message: err.message,
              stack: err.stack
            });
            renderList([]); // Render empty list on error
          }
        },
        renderItem: function (item) {
            return `
              <div class="mention-item">
                ${item.avatar 
                  ? `<img src="${item.avatar}" alt="${item.value}" class="mention-avatar" />` 
                  : ''
                }
                <span class="mention-name">${item.value}</span>
              </div>
            `;
          },
          
        onSelect: function (item, insertItem) {
          insertItem(item);
        }
      }
    }
  });
  
  
  const Deskurl = "https://desk.zoho.com";
  
  
  document.addEventListener("DOMContentLoaded", function () 
  {
    const serviceDropdown = document.getElementById("service");
    const requestTypeDropdown = document.getElementById("requesttype");
    const requestFormDropdown = document.getElementById("requestForm");
    const requestFormLabel = document.getElementById("requestFormLabel");
    const rcaDropdown = document.getElementById("rca");
    const rcaLabel = document.querySelector("label[for='rca']");
    const otherFieldsContainer = document.getElementById("otherFieldsContainer");
    const deptbackrequest = document.getElementById("deptback");
  
    const optionalFields = 
    [
        "zuid", "zgid", "dc", "region", "severity", "service", "rca", "requestForm"
    ];
  
    function toggleField(id, show) 
    {
        const el = document.getElementById(id);
        const label = document.querySelector(`label[for='${id}']`);
        if (el) el.style.display = show ? "block" : "none";
        if (label) label.style.display = show ? "block" : "none";
    }
    function updateFieldVisibility() 
    {
        const typeValue = requestTypeDropdown.value;
    
        otherFieldsContainer.style.display = typeValue ? "block" : "none";
    
        if (typeValue === "new_request") 
            {
            optionalFields.forEach(id => toggleField(id, true));
        } else if (typeValue === "reassign_sme") 
            {
            optionalFields.forEach(id => toggleField(id, false));
            toggleField("zuid", true);
            toggleField("zgid", true);
            toggleField("service", true);
            toggleField("severity", true); // 👈 Show service field for reassign_sme
            toggleField("severity-note", true);
        }
    }
    
    requestTypeDropdown.addEventListener("change", updateFieldVisibility);
    serviceDropdown.addEventListener("change", function () 
    {
        const showCRM = serviceDropdown.value === "zoho_crm";
        const typeValue = requestTypeDropdown.value;
    
        const showRequestForm = showCRM && typeValue === "new_request";
        toggleField("requestForm", showRequestForm);
        toggleField("requestFormLabel", showRequestForm);
        toggleField("rca", showCRM);
        toggleField("rcaLabel", showCRM);
  
    });
    
  
  updateFieldVisibility(); 
  
  });
  const MAX_CHARACTERS = 27000;
  const charCountDisplay = document.getElementById("charCount");
  
  quill.on("text-change", function () 
  {
    const text = quill.getText().trim();
    const length = text.length;
  
    charCountDisplay.textContent = `${length}/${MAX_CHARACTERS} characters`;
  
    if (length > MAX_CHARACTERS) {
        quill.setText(text.slice(0, MAX_CHARACTERS));
        ZOHODESK.notify({
            title: "Error",
            content: `You have exceeded the maximum character limit of ${MAX_CHARACTERS}.`,
            icon: "error",
            autoClose: true,
        });
    }
  });
  
  const requesttype = document.getElementById('requesttype');
  const initialNote = document.getElementById('initialNote');
  const additionalNote = document.getElementById('additionalNote');
  const severityDropdown = document.getElementById('severity');
  const severityNote = document.getElementById('severity-note');
  
  const additionalMessages = 
  {
  new_request: "Ensure you have selected 'New Request' if this is the first time the ticket is being assigned to an SME.",
  reassign_sme: "Ensure you have selected the 'Reassign to SME' option if the ticket was previously assigned to an SME and has been returned to you."
  };
  
  const severityMessages = 
  {
  S1: "Note: Please ensure that this option is selected only if the issue is business-critical or if the customer wants to escalate."
  };
  
  requesttype.addEventListener('change', function () {
    const selectedValue = requesttype.value;
  
    if (additionalMessages[selectedValue]) {
      initialNote.style.display = 'none';
      additionalNote.textContent = additionalMessages[selectedValue];
      additionalNote.style.display = 'block';
    } else {
      initialNote.style.display = 'block';
      additionalNote.style.display = 'none';
    }
  
    // Reset severity note visibility
    if (selectedValue === 'reassign_sme') 
        {
      severityNote.style.display = 'none';
  
      // ✅ Populate ZUID and ZGID if values are available
    //   if (zuid && zgid) 
    //     {
    //     document.getElementById("zuid").value = zuid.value;
    //     document.getElementById("zgid").value = zgid.value;
    //   }
    // } else {
    //   // Clear ZUID and ZGID for other types (optional)
    //   document.getElementById("zuid").value = '';
    //   document.getElementById("zgid").value = '';
    }
  });
  
  // Handle severity selection
  severityDropdown.addEventListener('change', function () 
  {
  const selectedSeverity = severityDropdown.value;
  const requestTypeSelected = requesttype.value;
  
  // Only show S1 message if request type is NOT 'reassign_sme'
  if (selectedSeverity === 'S1' && (requestTypeSelected == 'reassign_sme' || requestTypeSelected == 'new_request')) 
    {
    severityNote.textContent = severityMessages[selectedSeverity];
    severityNote.style.display = 'block';
  } 
  else 
  {
    severityNote.style.display = 'none';
  }
  });
  
  
  // Get elements
  const submitBtn = document.getElementById('submitBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('myForm');
  
  let ticketId;
  let ticketnumber;
  let ticketurl;
  let currentText;
  let channel;
  let departmentName;
  let userEmail;
  let userid;
  var newTicketId;
  let crmrecordid;
  
  let filesArray = []; // Store selected files
  let uploadedFiles = []; // Store uploaded files with their attachment IDs
  
  // File handling logic
  const fileInput = document.getElementById('fileInput');
  const fileList = document.getElementById('fileList');
  const errorMessage = document.getElementById('error-message');
  const dropArea = document.getElementById('dropArea');
  
  // Handle file selection
  fileInput.addEventListener('change', handleFiles);
  
  // Handle drag-and-drop
  dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('dragover');
  });
  
  dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('dragover');
  });
  
  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('dragover');
    const droppedFiles = e.dataTransfer.files;
    handleFiles({ target: { files: droppedFiles } });
  });
  
  // Function to handle file selection and upload
  function handleFiles(event) {
    const selectedFiles = Array.from(event.target.files);
    errorMessage.textContent = ''; // Clear previous error
  
    // Check if the total number of files exceeds 10
    if (filesArray.length + selectedFiles.length > 10) 
        {
        errorMessage.textContent = 'You can only select a maximum of 10 files.';
        return;
    }
  
    let totalSize = filesArray.reduce((sum, file) => sum + file.size, 0); // Get current total size
    let newFiles = [];
  
    for (let file of selectedFiles) {
        if (file.size > 20 * 1024 * 1024) { // Check for 20MB file limit
            errorMessage.textContent = 'Individual file size cannot exceed 20MB.';
            return;
        }
  
        if (totalSize + file.size > 50 * 1024 * 1024) { // Check total 50MB limit
            errorMessage.textContent = 'You have exceeded the maximum allowed attachment size of 50 MB.';
            return;
        }
  
        totalSize += file.size;
        newFiles.push(file);
    }
  
    filesArray = [...filesArray, ...newFiles]; // Keep old files & add new ones
    // console.log('Total selected files:', filesArray); // Debugging
  
    updateFileList(); // Update UI
  
    // Upload only new files
    // console.log('Uploading new files:', newFiles); // Debugging
    uploadFiles(newFiles);
  }
  
  // Function to update the file list UI
  function updateFileList() 
  {
    fileList.innerHTML = '';
    filesArray.forEach((file, index) => {
        const li = document.createElement('li');
        li.className = 'file-item';
        li.innerHTML = `
            <div class="file-info">
                <span class="file-name">${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                <i class="fas fa-trash delete-icon" onclick="removeFile(${index})"></i>
            </div>
            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-bar-inner"></div>
                </div>
                <span class="progress-percentage">Uploading...</span>
            </div>
        `;
        fileList.appendChild(li);
  
        // Check if the file has already been uploaded
        const uploadedFile = uploadedFiles.find(f => f.file.name === file.name && f.file.size === file.size);
        if (uploadedFile) {
            const progressBarInner = li.querySelector('.progress-bar-inner');
            const progressPercentage = li.querySelector('.progress-percentage');
  
            // Update UI for already uploaded file
            progressBarInner.style.width = '100%';
            progressBarInner.style.backgroundColor = 'blue';
            progressPercentage.textContent = 'Uploaded';
            li.classList.add('uploaded');
        }
    });
  }
  
  // Function to remove a file from the list
  function removeFile(index) {
    const removedFile = filesArray.splice(index, 1)[0]; // Remove the file from the array
    errorMessage.textContent = ''; // Reset error message
    updateFileList(); // Update the UI
    // console.log('File removed. Remaining files:', filesArray);
  
    // Remove the file from uploadedFiles if it exists
    const uploadedFileIndex = uploadedFiles.findIndex(f => f.file.name === removedFile.name && f.file.size === removedFile.size);
    if (uploadedFileIndex !== -1) 
        {
        uploadedFiles.splice(uploadedFileIndex, 1); // Remove the file from uploadedFiles
    }
  }
  
  adminlevel="adminlevel";
  userlevel="userconnection";
  
  // Function to upload files to Zoho Desk
  async function uploadFiles(files) {
    let attachmentIds = [];
    let failedFiles = [];
  
    if (files.length > 0) {
        const uploadPromises = files.map(async (file, index) => {
            const fileItem = fileList.children[index];
            const progressBarInner = fileItem.querySelector('.progress-bar-inner');
            const progressPercentage = fileItem.querySelector('.progress-percentage');
  
            // Check if the file has already been uploaded
            const uploadedFile = uploadedFiles.find(f => f.file.name === file.name && f.file.size === file.size);
            if (uploadedFile) {
                // console.log(`File ${index + 1} already uploaded. Attachment ID:`, uploadedFile.attachmentId);
                attachmentIds.push(uploadedFile.attachmentId);
  
                // Update UI for already uploaded file
                progressBarInner.style.width = '100%';
                progressBarInner.style.backgroundColor = 'blue';
                progressPercentage.textContent = 'Uploaded';
                fileItem.classList.add('uploaded');
                return;
            }
            //752645388
            try {
                // 4241905
                const res = await ZOHODESK.request({
                    url: `https://desk.zoho.com/api/v1/uploads`,
                    headers: { orgId: "4241905" }, // Use the correct Org ID
                    data: {},
                    postBody: {},
                    fileObj: [{ key: "file", file: file }],
                    type: "POST",
                    connectionLinkName: userlevel,
                });
  
                // console.log("Full API Response:", res);
  
                let parsedResponse;
                try {
                    parsedResponse = typeof res === "string" ? JSON.parse(res) : res;
                
                    // Some Zoho APIs wrap the real body in a `response` string → parse that too
                    if (typeof parsedResponse.response === "string") {
                        parsedResponse.response = JSON.parse(parsedResponse.response);
                    }
                
                    /* ─────────────────────────────────────────────────────────
                       1️⃣  Check for an explicit failure coming from the upload
                    ──────────────────────────────────────────────────────────*/
                    const status   = parsedResponse.status        // plain responses
                                 ?? parsedResponse.response?.status; // wrapped responses
                    const errMsg   = parsedResponse.errorMessage
                                 ?? parsedResponse.response?.errorMessage;
                
                    if (status && status.toLowerCase() === "failure") 
                        {
                        // ❌ upload rejected by the server
                        failedFiles.push(file.name);
                        console.error(`File ${index + 1} failed:`, errMsg);
                
                        progressBarInner.style.backgroundColor = "red";
                        progressPercentage.textContent = errMsg || "Failed";
                
                        // Show toast to the agent (optional)
                        await ZOHODESK.notify({
                            title: "Upload failed",
                            content: errMsg || "Upload rejected by server",
                            icon: "error",
                            autoClose: true
                        });
                
                        return;              // skip the rest of the success‑flow for this file
                    }
                
                    /* ─────────────────────────────────────────────────────────
                       2️⃣  Success branch – get attachment id
                    ──────────────────────────────────────────────────────────*/
                    const attachmentData =
                        parsedResponse.response?.statusMessage ?? parsedResponse;
                
                    if (attachmentData.id) {
                        const attachmentId = attachmentData.id;
                        attachmentIds.push(attachmentId);
                        uploadedFiles.push({ file, attachmentId });
                
                        progressBarInner.style.width = "100%";
                        progressBarInner.style.backgroundColor = "blue";
                        progressPercentage.textContent = "Uploaded";
                        fileItem.classList.add("uploaded");
                    } else {
                        // We got no id → treat as failure
                        failedFiles.push(file.name);
                        progressBarInner.style.backgroundColor = "red";
                        progressPercentage.textContent = "Failed";
                    }
                }
                 catch (e) {
                    // console.error("Error parsing response:", e);
                    failedFiles.push(file.name);
  
                    // Update UI for failed upload
                    progressBarInner.style.backgroundColor = 'red';
                    progressPercentage.textContent = 'Failed';
                }
            } catch (error) 
            {
                // console.error(`File ${index + 1} upload failed:`, error);
                failedFiles.push(file.name);
  
                // Update UI for failed upload
                progressBarInner.style.backgroundColor = 'red';
                progressPercentage.textContent = 'Failed';
            }
        });
  
        await Promise.all(uploadPromises);
    }
  
    // console.log("All file uploads completed. Attachment IDs:", attachmentIds);
    // console.log("Failed Files:", failedFiles);
  
    // Force UI update after all files are processed
    updateFileList();
  
    return { attachmentIds, failedFiles };
  }
  
  setTimeout(() => {
    quill.focus();
  }, 0);
  
  
  // ===================================================================================
  // --- Configuration Constants ---
  // ===================================================================================
  const CONFIG = {
    DEPARTMENTS: {
      ZOHO_CRM: "4000000010045",
      ZOHO_BIGIN: "4001558193077",
      PARTNER_SUPPORT: "4000000010045" // Example, replace with actual
    },
    TEAMS: {
      ZOHO_CRM: "4010745944203",
      ZOHO_BIGIN: "4012158145739"
    },
    TRANSITIONS: {
      ZOHO_CRM: "4004822377756",
      ZOHO_BIGIN: "4007838606904",
      PARTNER_SUPPORT: "4020338050335"
    },
    ORG_ID: "4241905",
    MAX_FILE_UPLOADS: 10,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000
  };
  
  /**
   * Creates HTML content for ticket comment
   */
  function createCommentContent(requestType, zuid, zgid, dc, severity, rca, departmentName, quill) {
    const delta = quill.getContents();
    let formattedText = delta.ops.map(op => {
      if (op.insert?.mention) {
        return `zsu[@user:${op.insert.mention.id}]zsu`;
      }
      return typeof op.insert === 'string' ? op.insert.replace(/\n/g, '<br>') : '';
    }).join('');
  
    const baseHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <p><strong>${requestType === 'new_request' ? 'New Request' : 'Reassign'} Details:</strong></p>
        <ul style="list-style: none; padding-left: 0; margin-bottom: 1em;">
          <li><strong>ZUID:</strong> ${zuid}</li>
          <li><strong>ZGID:</strong> ${zgid}</li>
          ${requestType === 'new_request' ? `<li><strong>Data Center:</strong> ${dc}</li>` : ''}
        </ul>
        <p><strong>Comment:</strong></p>
        <div style="margin-left: 1rem; margin-bottom: 1em; white-space: pre-line;">${formattedText}</div>
        <p><strong>Other Details:</strong></p>
        <ul style="list-style: none; padding-left: 0;">
          <li><strong>Severity:</strong> ${severity}</li>
          <li><strong>Is RCA required?:</strong> ${rca}</li>
          <li><strong>Department:</strong> ${departmentName}</li>
        </ul>
      </div>`;
  
    return baseHtml;
  }
  
  /**
   * Builds custom fields object for Zoho Desk
   */
  function buildCustomFields(service, requestType, formData) {
    const { region, requestForm, rca, zgid, severity, dc } = formData;
    
    const baseFields = {
      cf_data_center: requestType === "reassign_sme" ? (formData.cf_data_center ?? "US") : dc,
      cf_severity: severity
    };
  
    if (service === 'zoho_crm') {
      return {
        ...baseFields,
        cf_zoho_service_name: "Zoho CRM",
        cf_region: requestType === "reassign_sme" ? (formData.cf_region ?? "US") : region,
        cf_request_from: requestType === "reassign_sme" ? (formData.cf_request_from ?? "Paid User") : requestForm,
        cf_rca_available: rca,
        cf_related_project: zgid,
        cf_desk_dept_to_be_moved_back: formData.deptBackground || "Zoho CRM"
      };
    }
    
    return baseFields;
  }
  /**
   * Validates form inputs
   */
  function validateInputs(requestType, service, formData, quill, filesArray) {
    const errors = [];
    
    if (!formData.zuid?.trim()) errors.push("ZUID is required");
    if (!formData.zgid?.trim()) errors.push("ZGID is required");
    if (!quill.getText().trim()) errors.push("Description is required");
    
    if (requestType === 'new_request') {
      if (!formData.dc?.trim()) errors.push("Data Center is required");
      if (!formData.region?.trim()) errors.push("Region is required");
      if (!formData.severity?.trim()) errors.push("Severity is required");
      
      if (service === 'zoho_crm') {
        if (!formData.rca?.trim()) errors.push("RCA is required");
        if (!formData.requestForm?.trim()) errors.push("Request Form is required");
      }
    }
    
    if (filesArray.length > CONFIG.MAX_FILE_UPLOADS) {
      errors.push(`Maximum ${CONFIG.MAX_FILE_UPLOADS} files allowed`);
    }
    
    return errors;
  }
  
  // ===================================================================================
  // --- Helper Functions ---
  // ===================================================================================
  
  async function withRetry(fn, operationName, attempts = CONFIG.RETRY_ATTEMPTS, delay = CONFIG.RETRY_DELAY) {
    let lastError;
    
    for (let i = 0; i < attempts; i++) {
      try {
        console.log(`🔄 [Attempt ${i + 1}] ${operationName}`);
        const result = await fn();
        console.log(`✅ Success: ${operationName}`, result);
        return result;
      } catch (error) {
        lastError = error;
        console.error(`❌ Attempt ${i + 1} failed for ${operationName}:`, error);
        if (i < attempts - 1) {
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    
    console.error(`💥 All attempts failed for ${operationName}`);
    throw lastError;
  }
  // ===================================================================================
  // --- Console Logging Function ---
  // ===================================================================================
  
  
  async function sendLogsToCRM(consoleData, ticketId, ticketnumber, userEmail) {
    console.log('=== STARTING sendLogsToCRM ===');
    console.log('Ticket ID:', ticketId);
    console.log('Ticket Number:', ticketnumber);
    console.log('User Email:', userEmail);
    console.log('Logs Length:', consoleData.length);
    try {
      console.log('📤 Sending console logs to CRM function...');
      
      const response = await ZOHODESK.request({
        url: 'https://www.zohoapis.com/crm/v7/functions/smeassistancebot/actions/execute?auth_type=apikey&zapikey=1003.5e0e345eaa02d26f3259b77f609a63c6.c038bcd68ba18b7e1c916a9160e166ae',
        headers: { 
          'Content-Type': 'application/json'
        },
        type: 'POST',
        postBody: JSON.stringify({
          data: {
            ticket_id: ticketId,
            ticket_number: ticketnumber,
            user_email: userEmail,
            console_logs: consoleData,
            timestamp: new Date().toISOString()
          }
        }),
      });
      const parsedResponse = JSON.parse(response);
      console.log('📄 CRM Function Response:', parsedResponse);
      
      if (parsedResponse?.error) {
        throw new Error(parsedResponse.error.message || 'Error from CRM function');
      }
      
      console.log('✅ Console logs successfully sent to CRM');
      return parsedResponse;
    } 
    catch (error) {
      console.error('❌ Failed to send logs to CRM function:', error);
      throw error;
    }
  }
  
  // ===================================================================================
  // --- Main Process with Enhanced Logging ---
  // ===================================================================================
  
  async function handleSmeRequest() {
    // Initialize log collection and preserve original console
    const consoleLogs = [];
    const originalConsole = { ...console };
    let logsSent = false;
  
    // Capture console output
    ['log', 'error', 'warn', 'info'].forEach(method => {
      console[method] = (...args) => {
        originalConsole[method](...args);
        consoleLogs.push({
          timestamp: new Date().toISOString(),
          type: method.toUpperCase(),
          message: args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' ')
        });
      };
    });
  
    console.group('🚀 Starting SME Request Process');
    
    try {
      // --- Initial Setup ---
      console.log('🔍 Gathering form data...');
      const requestType = document.getElementById("requesttype").value;
      const service = document.getElementById("service").value.trim();
      
      const formData = {
        zuid: document.getElementById("zuid").value,
        zgid: document.getElementById("zgid").value,
        dc: document.getElementById("dc")?.value,
        region: document.getElementById("region")?.value,
        severity: document.getElementById("severity")?.value,
        rca: document.getElementById("rca")?.value,
        requestForm: document.getElementById("requestForm")?.value,
        deptBackground: document.getElementById("deptback")?.value || "Zoho CRM"
      };
  
      console.log('📋 Form Data:', formData);
  
      // --- Validation ---
      console.log('🔎 Validating inputs...');
      const validationErrors = validateInputs(requestType, service, formData, quill, filesArray);
      if (validationErrors.length > 0) {
        console.error('❌ Validation errors:', validationErrors);
        await ZOHODESK.showpopup({
          title: "Validation Error",
          content: validationErrors.join("<br>"),
          type: "alert",
          color: "red",
          okText: "Ok"
        });
        throw new Error("Validation failed");
      }
  
      // --- UI State ---
      console.log('🎨 Updating UI state...');
      document.getElementById('overlay-loader').style.display = 'flex';
      submitBtn.disabled = true;
  
      // --- Confirmation ---
      console.log('🔄 Showing confirmation popup...');
      const serviceName = service === 'zoho_crm' ? "Zoho CRM" : "Zoho Bigin";
      const popupResponse = await ZOHODESK.showpopup({
        title: "SME Assistance",
        content: `Are you sure you want to move this request to ${serviceName} SME?`,
        type: "confirmation",
        color: "blue",
        okText: "Move",
        cancelText: "Cancel"
      });
  
      if (popupResponse?.cancelText) {
        throw new Error('Operation cancelled by user');
      }
  
      // --- File Upload ---
      console.log('📤 Starting file upload process...');
      const uploadResult = await withRetry(
        () => uploadFiles(filesArray),
        "File Upload",
        3, // 3 retries
        1000 // 1 second delay between retries
      );
      const { attachmentIds, failedFiles } = uploadResult;
      
      if (failedFiles.length > 0) {
        console.warn('⚠️ Failed files:', failedFiles);
        ZOHODESK.notify({
          content: `Warning: ${failedFiles.length} file(s) failed to upload`,
          icon: "warning"
        });
      }
  
      // --- CRM Record Creation ---
      if (requestType === 'new_request') 
        {
        console.log('🛠️ Creating CRM record...');
        const crmPayload = {
          data: [{
            Ticket_ID: ticketnumber,
            Ticket_URL: ticketurl,
            DC: formData.dc,
            ZGID: formData.zgid,
            ZUID: formData.zuid,
            Channel: channel,
            Severity: formData.severity,
            Issue: quill.getText().trim(),
            Department: departmentName,
            Requested_by: userEmail,
            Service: serviceName,
            Source_Type: "Zoho Desk",
            Region: formData.region,
            Is_RCA_Required_Avaliable: service === 'zoho_crm' ? formData.rca : null,
            Request_From: service === 'zoho_crm' ? formData.requestForm : null,
            Request_Type: requestType,
            Via_extension: true
          }]
        };
        
        const crmResponse = await withRetry(
          async () => {
            const response = await ZOHODESK.request({
              url: 'https://www.zohoapis.com/crm/v7/SME_2_0',
              headers: { 'Content-Type': 'application/json' },
              type: 'POST',
              postBody: JSON.stringify(crmPayload),
              connectionLinkName: adminlevel
            });
            
            const parsedResponse = JSON.parse(JSON.parse(response).response);
            if (parsedResponse.statusMessage?.data?.some(item => item.code?.toLowerCase() !== "success")) {
              throw new Error('CRM creation failed - invalid status');
            }
            return parsedResponse;
          },
          "CRM Record Creation"
        );
      }
  
      // --- Ticket Processing ---
      console.log('🎫 Starting ticket processing...');
      const departmentId = CONFIG.DEPARTMENTS[service.toUpperCase()];
      if (!departmentId) throw new Error(`Invalid department configuration for service: ${service}`);
  
      // Add SME Assistance tag
      await withRetry(
        () => ZOHODESK.request({
          url: `https://desk.zoho.com/api/v1/tickets/${ticketId}/associateTag`,
          type: 'POST',
          headers: { 'Content-Type': 'application/json' },
          postBody: JSON.stringify({ tags: ["SME Assistance"] }),
          connectionLinkName: userlevel
        }),
        "Add Tag"
      );
  
      // Special handling for Partner Support
      if (departmentName === "Partner Support") 
        {
        try {
          const serviceNameForPartner = service === 'zoho_crm' ? "Zoho CRM" : "Bigin";
          
          // 1. Partner Support Transition with enhanced error handling
          console.log("🔄 Starting Partner Support Transition...");
          await withRetry(
            async () => {
              const response = await ZOHODESK.request({
                url: `https://support.zoho.com/api/v1/tickets/${ticketId}/transitions/${CONFIG.TRANSITIONS.PARTNER_SUPPORT}/perform`,
                headers: {
                  'Content-Type': 'application/json',
                  'orgId': CONFIG.ORG_ID
                },
                type: 'POST',
                postBody: JSON.stringify({
                  FIELD_UPDATE: {
                    customFields: {
                      cf_moved_to_department_central_partner_support: serviceNameForPartner
                    }
                  }
                }),
                connectionLinkName: userlevel
              });
            },
            "Partner Support Transition"
          );
          console.log("✅ Partner Support Transition completed successfully");
      
          // 2. Add delay to ensure transition complete
      
          // 3. Move Ticket with enhanced error handling
          console.log("🔄 Moving ticket to department...");
          await withRetry(
            async () => {
              const response = await ZOHODESK.request({
                url: `https://desk.zoho.com/api/v1/tickets/${ticketId}/move`,
                headers: { 'Content-Type': 'application/json' },
                type: 'POST',
                postBody: JSON.stringify({ departmentId }),
                connectionLinkName: userlevel
              });
  
              return response;
            },
            "Move Ticket"
          );
          console.log(`✅ Ticket moved to department ${departmentId}`);
      
          // 4. Add delay before assignee update
          await new Promise(resolve => setTimeout(resolve, 2000));
      
          // 5. Update Assignee with the improved function
          console.log("🔄 Updating assignee...");
          await withRetry(() => updateAssignee(ticketId, userid), "Update Assignee");
          console.log(`✅ Assignee updated to ${userid} successfully`);
  
          await new Promise(resolve => setTimeout(resolve, 1000));
      
        } 
        catch (error) 
        {
          console.error("❌ Critical error in Partner Support flow:", error);
          
          // Add your error recovery logic here, such as:
          // - Reverting changes
          // - Notifying admins
          // - Logging to error tracking system
          
          throw error; // Re-throw after handling
        }
      }
      // Enhanced updateAssignee function with better validation
  
      else 
      {
        // Move ticket to new department
        await withRetry(
          () => ZOHODESK.request({
            url: `https://desk.zoho.com/api/v1/tickets/${ticketId}/move`,
            headers: { 'Content-Type': 'application/json' },
            type: 'POST',
            postBody: JSON.stringify({ departmentId }),
            connectionLinkName: userlevel
          }),
          "Move Ticket"
        );
           // Update assignee
      await withRetry(
        () => ZOHODESK.request({
          url: `https://desk.zoho.com/api/v1/tickets/${ticketId}`,
          type: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          postBody: JSON.stringify({ assigneeId: userid }),
          connectionLinkName: userlevel
        }),
        "Update Assignee"
      );
      console.log('✅ Assignee updated successfully');
         // Add delay for ticket update propagation
      }
  
      async function updateAssignee(ticketId, userid) 
      {
        requestBody = { assigneeId: userid };
        try {
            console.log("🔄 Updating ticket assignee...", JSON.stringify(requestBody));
            
            const updateticket = await ZOHODESK.request({
                url: `https://desk.zoho.com/api/v1/tickets/${ticketId}`,
                type: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                postBody: JSON.stringify(requestBody),
                connectionLinkName: userlevel
            });
        
            console.log("✅ Ticket updated successfully:", updateticket);
        
        }
         catch (error) {
          console.error('Assignee update failed:', {
            error: error.message,
            ticketId,
            userid,
            departmentId,
            timestamp: new Date().toISOString()
          });
          throw error; // Re-throw after logging
        }
      }
      // // Update assignee
      // await withRetry(
      //   () => ZOHODESK.request({
      //     url: `https://desk.zoho.com/api/v1/tickets/${ticketId}`,
      //     type: 'PATCH',
      //     headers: { 'Content-Type': 'application/json' },
      //     postBody: JSON.stringify({ assigneeId: userid }),
      //     connectionLinkName: userlevel
      //   }),
      //   "Update Assignee"
      // );
      const delayDuration = 1000;
      console.log(`⏳ Waiting ${delayDuration}ms for ticket update to propagate...`);
      const delayStart = Date.now();
      await new Promise(resolve => setTimeout(resolve, delayDuration));
      const delayEnd = Date.now();
      console.log(`⌛ Delay completed (${delayEnd - delayStart}ms elapsed)`);
  
      // Verify ticket status with retries
      console.log('🔍 Verifying ticket status...');
      let ticketInfo;
      let attempts = 0;
      const maxAttempts = 3;
      const pollInterval = 1000;
  
      while (attempts < maxAttempts) 
        {
        attempts++;
        console.log(`🔄 Checking ticket status (attempt ${attempts}/${maxAttempts})...`);
  
        ticketInfo = await ZOHODESK.get('ticket');
  
        console.log("✅ Post-move ticket data:", ticketInfo);
        const ticket = ticketInfo.ticket;
  
        console.log(ticketInfo);
        
        if (ticketInfo.ticket.assignee?.id === userid) 
          {
  
          console.log('✅ Assignee update confirmed');
          break;
        }
        if (attempts < maxAttempts) 
          {
          console.log(`⏳ Waiting ${pollInterval}ms before next check...`);
          await new Promise(r => setTimeout(r, pollInterval));
        }
      }
      if (attempts >= maxAttempts) 
        {
        console.warn('⚠️ Assignee update not confirmed after maximum attempts');
      }
  
      console.log('📊 Current Ticket Info:', ticketInfo.ticket);
      console.log('ticketInfo.ticket.assignee?.id',ticketInfo.ticket.assignee?.id);
      console.log('userid',userid);
      
      if (ticketInfo.ticket.status === "Open" && ticketInfo.ticket.assignee?.id === userid)
         {
        // Prepare transition data
        const customFields = buildCustomFields(service, requestType, formData);
        let commentContent = createCommentContent(requestType, formData.zuid, formData.zgid, 
            formData.dc, formData.severity, formData.rca, departmentName, quill);
        
        if (failedFiles.length > 0) 
          {
            commentContent += `<p><strong>Warning:</strong> Failed to upload: ${failedFiles.join(', ')}</p>`;
        }
  
        const transitionData = {
            COMMENT: { 
                isPublicComment: false, 
                content: commentContent, 
                uploads: attachmentIds 
            },
            FIELD_UPDATE: {
                ...(service === 'zoho_crm' ? { 
                    category: "General", 
                    subCategory: "Others",
                    teamId: CONFIG.TEAMS.ZOHO_CRM
                } : {
                    category: "Activities",
                    teamId: CONFIG.TEAMS.ZOHO_BIGIN
                }),
                assigneeId: null,
                customFields
            }
        };
  
        // Execute transition
        const transitionResponse = await withRetry(
            async () => {
                const response = await ZOHODESK.request({
                    url: `https://support.zoho.com/api/v1/tickets/${ticketId}/transitions/${CONFIG.TRANSITIONS[service.toUpperCase()]}/perform`,
                    headers: {
                        'Content-Type': 'application/json',
                        'orgId': CONFIG.ORG_ID
                    },
                    type: 'POST',
                    postBody: JSON.stringify(transitionData),
                    connectionLinkName: userlevel
                });
                
                const parsedResponse = JSON.parse(response);
                console.log('parsedResponse',parsedResponse);
  
                if (parsedResponse.error) 
                  {
                  throw new Error(parsedResponse.error.message);
                }
                return parsedResponse;
            },
            "Blueprint Transition"
        );
  
        console.log("✅ Blueprint transition successful.");
  
        ZOHODESK.notify({ 
          content: "✅ Request moved successfully!", 
          icon: "success" 
        });
  
        // --- Success Handling ---
        // 1. Send logs before any UI changes
        if (consoleLogs.length > 0 && !logsSent) 
          {
          await sendLogsToCRM(
            consoleLogs.map(log => `[${log.timestamp}] ${log.type}: ${log.message}`).join('\n\n'),
            ticketId,
            ticketnumber,
            userEmail
          );
          logsSent = true;
        }
        // 2. Restore console
        Object.assign(console, originalConsole);
  
        // 3. Clean up UI
        form.reset();
        filesArray = [];
        fileInput.value = '';
        updateFileList();
        
        document.getElementById('overlay-loader').style.display = 'none';
        submitBtn.disabled = false;
  
        // 5. Navigate
        await ZOHODESK.invoke("ROUTE_TO", "ticket.properties");
        location.reload();
      }
      else {
        const customFields = buildCustomFields(service, requestType, formData);
        let commentContent = createCommentContent(requestType, formData.zuid, formData.zgid, 
            formData.dc, formData.severity, formData.rca, departmentName, quill);
        
        // Add the additional note for failed transition
    // First ensure you have access to the current ticket status and assignee
  const currentStatus = ticketInfo?.ticket?.status || requeststatus; // Fallback to requeststatus if ticketInfo not available
  const currentAssignee = ticketInfo?.ticket?.assignee?.id || assigneeId; // Fallback to assigneeId
  
  console.log('Current Status:', currentStatus);
  console.log('Current Assignee:', currentAssignee);
  console.log('User ID:', userid);
  console.log('Status condition:', currentStatus !== "Open");
  console.log('Assignee condition:', currentAssignee !== userid);
  
  commentContent += `
    <div style="margin-top: 1.5rem; padding: 0.75rem; background-color: #fff8e1; border-left: 4px solid #ffc107;">
      <p style="margin: 0; font-weight: bold; color: #ff6f00;">Note: [Auto Comment]</p>
      <p style="margin: 0.25rem 0 0;">
        This ticket was not assigned to the SME Team when the SME Assistance Bot was triggered. 
        Kindly re-assign the ticket to the SME Team.
      </p>
      <p style="margin: 0.5rem 0 0; font-weight: bold;">Error Details for SME:</p>
      <ul style="margin: 0.5rem 0 0; padding-left: 1.25rem;">
        ${currentStatus !== "Open" ? `<li>Ticket status is not "Open" (Current: ${currentStatus})</li>` : ''}
        ${currentAssignee !== userid ? `<li>You are not the assigned agent (Assigned to: ${currentAssignee || 'nobody'})</li>` : ''}
        ${currentStatus === "Open" && currentAssignee === userid ? '<li>CRM Blueprint transition failed – please reach out to the SME team.</li>' : ''}
      </ul>
    </div>
  `;
      
        if (failedFiles.length > 0) {
          commentContent += `<p><strong>Warning:</strong> Failed to upload: ${failedFiles.join(', ')}</p>`;
        }
      
        const commentPayload = { 
          content: commentContent, 
          commenterId: userid 
        };
        console.log("commentPayload:", commentPayload);
      
        // Add the comment to the ticket
        try {
          const deskcomment = await ZOHODESK.request({
            url: `https://desk.zoho.com/api/v1/tickets/${ticketId}/comments`,
            headers: { 'Content-Type': 'application/json' },
            type: 'POST',
            postBody: JSON.stringify(commentPayload),
            connectionLinkName: userlevel
          });
          console.log("Comment Added:", deskcomment);
          console.log("Comment Added Successfully.");
        } 
        catch (error) {
          console.error("Error adding the ticket comment:", error);
        }
        
        throw new Error(`Unable to run transition. Status: ${ticketInfo.ticket.status}, Assignee: ${ticketInfo.ticket.assignee?.id}`);
      }
    } catch (error) {
      console.group('💥 Error Details');
      console.error('Error Message:', error.message);
      console.error('Error Stack:', error.stack);
      console.groupEnd();
      
      // Restore UI immediately
      document.getElementById('overlay-loader').style.display = 'none';
      submitBtn.disabled = false;
      Object.assign(console, originalConsole);
  
      // Log error to CRM
      await logErrorToCRM({ 
        error, 
        ticketnumber, 
        userEmail, 
        departmentName, 
        adminlevel 
      }).catch(e => console.error('Error logging failed:', e));
  
      // Show error to user
      await ZOHODESK.showpopup({
        title: "Error",
        content: `Submission Failed: ${error.message}`,
        type: "alert",
        color: "red",
        okText: "Ok"
      });
  
      // Attempt to send logs if not already sent
      if (consoleLogs.length > 0 && !logsSent) 
        {
        await sendLogsToCRM(
          consoleLogs.map(log => `[${log.timestamp}] ${log.type}: ${log.message}`).join('\n\n'),
          ticketId,
          ticketnumber,
          userEmail
        ).catch(e => console.error('Final log sending failed:', e));
      }
    } finally {
      console.groupEnd();
    }
  }
  
  // Event Listener
  submitBtn.addEventListener('click', () => {
    console.clear();
    handleSmeRequest().catch(e => {
      console.error('Unhandled error in SME request:', e);
    });
  });
  
  
  // Cancel button click
  cancelBtn.addEventListener('click', () => 
    {
    event.preventDefault(); // Prevent any default form actions
    ZOHODESK.invoke("ROUTE_TO", "ticket.properties"); // Corrected typo
    // console.log("Cancel button clicked, but no form reset.");
  });
  
  
  window.onload = initializeTicket;
  
  async function initializeTicket() {
    try {
      const App = await ZOHODESK.extension.onload();
  
      const res = await ZOHODESK.get('ticket');
      console.log("Start>>",res);
      const ticket = res.ticket;
  
      ticketId = ticket.id;
      ticketnumber = ticket.number;
      ticketurl = ticket.link;
      channel = ticket.channel;
      requeststatus = ticket.status;
      cf_data_center = ticket.cf?.cf_data_center;
      cf_region = ticket.cf?.cf_region;
      cf_request_from = ticket.cf?.cf_request_from;
      assigneeId = ticket.assignee?.id || null;
  
      console.log("Ticket ID:", ticketId);
      console.log("Ticket Number:", ticketnumber);
      console.log("Ticket URL:", ticketurl);
      console.log("Channel:", channel);
      console.log("cf_request_from:", cf_request_from);
      console.log("cf_data_center:", cf_data_center);
      console.log("cf_region:", cf_region);
      console.log("assigneeId:", assigneeId);
      console.log("requeststatus:", requeststatus);
  
      document.getElementById("dc").value = cf_data_center || '';
      document.getElementById("region").value = cf_region || '';
  
      // Fetch CRM record from SME_2_0 module
      try {
        const smeresponse = await ZOHODESK.request({
          url: `https://www.zohoapis.com/crm/v8/SME_2_0/search?criteria=(Ticket_ID:equals:${ticketnumber})`,
          type: 'GET',
          headers: { 'Content-Type': 'application/json' },
          data: {},
          postBody: {},
          contentType: 'application/json',
          connectionLinkName: adminlevel
        });
  
        console.log("SME Response:", smeresponse);
        const parsed = JSON.parse(JSON.parse(smeresponse).response);
        const records = parsed.statusMessage?.data;
  
        if (Array.isArray(records) && records.length > 0) 
          {
          const first = records[0];
          crmrecordid = first.id;
          zuid = first.ZUID;
          zgid = first.ZGID;
  
          console.log("First Record ID:", crmrecordid);
          console.log("zuid:", zuid);
          console.log("zgid:", zgid);
  
          document.getElementById("zuid").value = zuid;
          document.getElementById("zgid").value = zgid;
        } else {
          console.log("No CRM records found.");
        }
      } 
      catch (e) {
        console.error("Error parsing SME response:", e);
        await logErrorToCRM({ error: e, ticketnumber, userEmail, departmentName, adminlevel });
      }
  
      // Get department name
      const deptResponse = await ZOHODESK.get("department.info", { id: ticket.departmentId });
      const departmentInfo = deptResponse["department.info"];
      if (departmentInfo && departmentInfo.length > 0) {
        departmentName = departmentInfo[0].name;
        console.log("Department Name:", departmentName);
        document.getElementById("deptback").value = departmentName;
      }
         // Get user ID
         const userIdResponse = await ZOHODESK.get("user.id");
         userid = userIdResponse["user.id"];
         console.log("User ID:", userid);
     
         // Get user email
         const userEmailResponse = await ZOHODESK.get("user.email");
         userEmail = userEmailResponse["user.email"];
         console.log("User Email:", userEmail);
  
         // 🚫 Enforce validation only if department is "Zoho CRM"
         if (departmentName === "Zoho CRM" && (requeststatus !== "Open" || !assigneeId || assigneeId !== userid))
    {
    const formContainer = document.querySelector(".form-container");
    formContainer.innerHTML = `
    <div class="error-message" style="padding: 1rem; border: 1px solid #f44336; background-color: #fdecea; color: #c62828; border-radius: 4px;">
      <h3 style="margin: 0 0 0.5rem;">Form Unavailable</h3>
      <p>You are not the owner of this ticket. To access this form, please ensure that:</p>
      <ul>
        <li>The ticket status is set to <strong>Open</strong>.</li>
        <li>You are assigned as the <strong>owner</strong> of the ticket.</li>
      </ul>
       <p>Please update the ticket status to <strong>Open</strong> and assign it to yourself, then proceed using the <strong>SME Assistance Bot</strong>.</p>
    </div>
  `;
    return; 
  }
     
  } catch (error) {
         console.error("Error during initialization:", error);
         await logErrorToCRM({ error, ticketnumber, userEmail, departmentName, adminlevel });
       }
  }
  
  
  // function handleError(error) 
  // {
  //     const message = error?.message || 'Unknown error';
  //     const name = error?.name || 'Error';
  
  //     console.error('--- SME Loading ERROR LOG ---');
  //     console.error('Timestamp (UTC):', new Date().toISOString());
  //     // console.error('Timestamp (IST):', getISTTimestamp());
  //     console.error('Error Type:', name);
  //     console.error('Error Message:', message);
  //     console.error('Stack Trace:', error?.stack || 'N/A');
  //     console.error('Error Object:', error);
  //     console.error('--- END ERROR LOG ---');
  
  //     ZOHODESK.notify({
  //         title: "Submission Failed",
  //         content: `🚨 ${name}: ${message}<br>Check console for full logs.`,
  //         icon: "error",
  //         autoClose: true
  //     });
  //     const loader = document.getElementById('overlay-loader');
  //     if (loader) loader.style.display = 'none';
  
  //     if (typeof submitBtn !== 'undefined' && submitBtn) 
  //         {
  //         submitBtn.disabled = false;
  //     }
  // }
  
  async function logErrorToCRM({ error, ticketnumber = "N/A", userEmail = "N/A", departmentName = "N/A" }) 
  {
    try {
        const payload = {
            data: [{
                Name: "SME Assistance Extension",
                Log_Message: typeof error === 'string' ? error : (error.message || JSON.stringify(error)),
                Reference: `ticketnumber: ${ticketnumber}\nuserEmail: ${userEmail}\ndepartmentName: ${departmentName}`
            }]
        };
  
        const createerror = await ZOHODESK.request({
            url: 'https://www.zohoapis.com/crm/v7/Error_Logs',
            headers: { 'Content-Type': 'application/json' },
            type: 'POST',
            postBody: JSON.stringify(payload),
            connectionLinkName: adminlevel
        });
  
        console.log("Error logged to CRM:", createerror);
    } 
    catch (logErr) 
    {
        console.error("Failed to log error to CRM:", logErr);
    }
  }