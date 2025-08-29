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


// populateDropdown();
submitBtn.addEventListener('click', async () => 
  {
  const requestType = document.getElementById("requesttype").value;
  const service = document.getElementById("service").value.trim();

  // --- Start: Input Validation ---
  try {
      const zuid = document.getElementById("zuid").value.trim();
      const zgid = document.getElementById("zgid").value.trim();
      const dc = document.getElementById("dc")?.value.trim() || "";
      const region = document.getElementById("region")?.value.trim() || "";
      const severity = document.getElementById("severity")?.value.trim() || "";
      const rca = document.getElementById("rca")?.value.trim() || "";
      const requestForm = document.getElementById("requestForm")?.value.trim() || "";
      const plainTextInfo = quill.getText().trim();       // For validation
      const richTextInfo = quill.root.innerHTML.trim();   // For storing/sending
      
      if (requestType === 'new_request') 
          {
          if (!form.reportValidity()) 
              {
              throw new Error("Please fill all required fields in the form.");
          }
      
          if (!plainTextInfo) 
              {
              throw new Error("Please provide issue details in the description field.");
          }
      
          if (filesArray.length > 10) 
            {
              throw new Error("You can upload a maximum of 10 files only.");
          }
      
          if (!zuid || !zgid || !dc || !region || !severity || !service) 
              {
              throw new Error("All fields including ZUID, ZGID, DC, Region, Severity, and Service must be filled.");
          }
      
          if (service === 'zoho_crm' && (!rca || !requestForm)) {
              throw new Error("For Zoho CRM, RCA and Request Form fields are mandatory.");
          }
      
      }
      //  else if (requestType === 'reassign_sme')
      //      {
      //     if (!plainTextInfo) {
      //         throw new Error("Please provide the issue details.");
      //     }
      
      //     if (!zuid || !zgid || !service) {
      //         throw new Error("ZUID, ZGID, and Service are required for Reassign to SME.");
      //     }
      
      //     // Again, use richTextInfo if needed
      // }
      
       else if (requestType === 'reassign_sme') 
          {
          // const textinfo = quill.getText().trim();
          // const textinfo = document.getElementById("issue").value.trim();
          const zuid = document.getElementById("zuid").value.trim();
          const zgid = document.getElementById("zgid").value.trim();

          // if (!textinfo) {
          //     throw new Error("Please provide the issue details.");
          // }
          if (!zuid || !zgid || !service) {
              throw new Error("ZUID, ZGID, and Service are required for Reassign to SME.");
          }
          if (!plainTextInfo) 
            {
            throw new Error("Please provide issue details in the description field.");
        }
      }
  } 
  catch (validationError) 
  {
      // Catch validation errors and show a popup
      await ZOHODESK.showpopup({
          title: "Alert!",
          content: validationError.message,
          type: "alert",
          contentType: "html",
          color: "red",
          okText: "Ok"
      });
      return; // Stop execution
  }
  // --- End: Input Validation ---

  // Show loader and disable button
  document.getElementById('overlay-loader').style.display = 'flex';
  submitBtn.disabled = true;

  // --- Start: Main Process with Error Handling ---
  try 
  {
const rca = document.getElementById('rca').value;
const region = document.getElementById('region').value;
const requestForm = document.getElementById('requestForm').value;
const zuid = document.getElementById('zuid').value;
const zgid = document.getElementById('zgid').value;
const plainTextInfo = quill.getText().trim();   
const deptBackground = document.getElementById("deptback")?.value.trim() || "Zoho CRM";
// Get rich text HTML
const textInfo = quill.root.innerHTML;

// Strip HTML to get plain text (if needed for validation)
const tempDiv = document.createElement('div');
tempDiv.innerHTML = textInfo;
const details = tempDiv.textContent.trim();

console.log("textInfo (HTML):", textInfo);
console.log("details (plain text):", details);

console.log("textInfo:", textInfo);

      let servicename, contentinfo;
      if (service === 'zoho_crm') 
          {
          servicename = "Zoho CRM";
          contentinfo = "Are you sure you want to move this request to Zoho CRM SME?";
      } 
      else if (service === 'zoho_bigin') 
          {
          servicename = "Zoho Bigin";
          contentinfo = "Are you sure you want to move this request to Zoho Bigin SME?";
      }
      var continueExec=true;

      // --- Confirmation Popup ---
      const popupResponse = await ZOHODESK.showpopup({
          title: "SME Assistance",
          content: contentinfo,
          type: "confirmation",
          contentType: "html",
          color: "blue",
          okText: "Move",
          cancelText: "Cancel"
      }).then(res=>{
          console.log("success");
          console.log("cancelText:", res?.cancelText);
      
          console.log("Popup Response:", res);
        },(err)=>{
          console.log('err');
          console.log(err);
          continueExec=false;
          document.getElementById('overlay-loader').style.display = 'none';
          submitBtn.disabled = false;
          return "";
        });
        

      // --- File Upload ---
      const { attachmentIds, failedFiles } = await uploadFiles(filesArray);
      if(continueExec)
           {
      // --- Zoho Creator Request ---
      let payload = {}; // Define payload here
   if (requestType === 'new_request') 
  {
  const dc = document.getElementById('dc').value;
  const severity = document.getElementById('severity').value;

  try {
      console.log("Sending data to Zoho CRM:");
  
      const crmResponse = await ZOHODESK.request({
          url: 'https://www.zohoapis.com/crm/v7/SME_2_0',
          headers: { 'Content-Type': 'application/json' },
          type: 'POST',
          postBody: JSON.stringify({
              data: [{
                  Ticket_ID: ticketnumber,
                  Ticket_URL: ticketurl,
                  DC: dc,
                  ZGID: zgid,
                  ZUID: zuid,
                  Channel: channel,
                  Severity: severity,
                  Issue: plainTextInfo,
                  Department: departmentName,
                  Requested_by: userEmail,
                  Service: servicename,
                  Source_Type: "Zoho Desk",
                  Region: region,
                  Is_RCA_Required_Avaliable: servicename === "Zoho CRM" ? rca : null,
                  Request_From: servicename === "Zoho CRM" ? requestForm : null,
                  Request_Type: requestType,
                  Via_extension: true
              }]
          }),
          connectionLinkName: adminlevel
      });
  
      console.log("Zoho CRM Response >> 668 line:", crmResponse);
      crmData = JSON.parse(JSON.parse(crmResponse).response).statusMessage;
      console.log("Parsed CRM Data:", crmData);
      const data = crmData.data;

      if (
          Array.isArray(data) &&
          data.some(item => item.code && item.code.toLowerCase() !== "success")
      ) 
      {
          throw new Error('line 638 >> CRM creation failed');
      }
      console.log("CRM Record Created:", data);
  
  } catch (exception) 
  {
      console.error("Error sending data to Zoho CRM:", exception);
  
      // Log to Zoho CRM using your reusable error logger
      await logErrorToCRM({
          error: exception,
          ticketnumber,
          userEmail,
          departmentName,
          adminlevel
      });
  
      throw new Error(`Failed to create/update Zoho CRM record: ${exception.message}`);
  }
} 
else if (requestType === 'reassign_sme') 
  {
  if (!crmrecordid) 
      {
      console.log("CRM record ID is not set for reassign_sme request type.", crmrecordid);

      await ZOHODESK.showpopup({
          title: "Missing Record",
          content: "No record found for this ticket. Please use 'New Request' instead.",
          type: "alert",
          color: "red",
          okText: "Ok"
      });

      document.getElementById('overlay-loader').style.display = 'none';
      submitBtn.disabled = false;
      return;
  }

  const severity = document.getElementById('severity').value;

  try {
      // --- Create/Update CRM Record ---
      const crmResponse = await ZOHODESK.request({
          url: 'https://www.zohoapis.com/crm/v7/SME_2_0',
          headers: { 'Content-Type': 'application/json' },
          type: 'POST',
          postBody: JSON.stringify({
              data: [{
                  Ticket_ID: ticketnumber,
                  Ticket_URL: ticketurl,
                  ZGID: zgid,
                  ZUID: zuid,
                  Channel: channel,
                  Severity: severity,
                  Issue: plainTextInfo,
                  Department: departmentName,
                  Requested_by: userEmail,
                  Service: servicename,
                  Source_Type: "Zoho Desk",
                  DC: cf_data_center || null,
                  Region: cf_region || null,
                  Is_RCA_Required_Avaliable: servicename === "Zoho CRM" ? rca : null,
                  Request_From: servicename === "Zoho CRM" ? requestForm : null,
                  Request_Type: requestType,
                  Via_extension: true
              }]
          }),
          connectionLinkName: adminlevel
      });
      console.log("Zoho CRM Response >> 660 line:");
      console.log(crmResponse);
      
      let code = ''; // Declare it in outer scope



      crmData = JSON.parse(JSON.parse(crmResponse).response).statusMessage;
      const data = crmData.data;
      console.log("CRM Data:");
      console.log(crmData);
      console.log(" Data:");
      console.log(data);
     

      if (
          Array.isArray(data) &&
          data.some(item => item.code && item.code.toLowerCase() !== "success")
      ) {
          throw new Error('line 638 >> CRM creation failed');
      }
      

      // --- Add Note to the Record ---
      // const crmNoteResponse = await ZOHODESK.request({
      //     url: `https://www.zohoapis.com/crm/v8/Notes`,
      //     headers: { 'Content-Type': 'application/json' },
      //     type: 'POST',
      //     postBody: JSON.stringify({
      //         data: [{
      //             Note_Title: "Reassign to SME",
      //             Note_Content: textInfo,
      //             Parent_Id: {
      //                 module: { api_name: "SME_2_0" },
      //                 id: crmrecordid
      //             }
      //         }]
      //     }),
      //     connectionLinkName: adminlevel
      // });

      // const noteParsed = JSON.parse(crmNoteResponse.response);
      // const noteCode = noteParsed.statusMessage.data[0].code;

      // if (noteCode.toUpperCase() !== "SUCCESS") {
      //     throw new Error('line 616 >> CRM Note failed');
      // }

  } catch (exception) 
  {
      console.error("Error during reassign_sme process:", exception);

      await logErrorToCRM({
          error: exception,
          ticketnumber,
          userEmail,
          departmentName,
          adminlevel
      });

      throw new Error(`Reassign SME failed: ${exception.message}`);
  }
}


let commentContent;

if (requestType === 'new_request') 
  {
const dc = document.getElementById('dc').value;
const severity = document.getElementById('severity').value;

// Get plain text and convert newlines to <br>
const rawTextInfo = quill.getText().trim();
const cleanedTextInfo = rawTextInfo.replace(/\n/g, '<br>');

const delta = quill.getContents();
let formattedTextInfo = '';

delta.ops.forEach(op => {
  if (op.insert.mention) {
    const { id } = op.insert.mention;
    formattedTextInfo += `zsu[@user:${id}]zsu`;
  } else if (typeof op.insert === 'string') {
    // Replace newlines in inserted text with <br> to preserve formatting
    formattedTextInfo += op.insert.replace(/\n/g, '<br>');
  }
});


commentContent = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <p><strong>New Request Details:</strong></p>
    <ul style="list-style: none; padding-left: 0; margin-bottom: 1em;">
      <li><strong>ZUID:</strong> ${zuid}</li>
      <li><strong>ZGID:</strong> ${zgid}</li>
      <li><strong>Data Center:</strong> ${dc}</li>
    </ul>

    <p><strong>Comment:</strong></p>
    <div style="margin-left: 1rem; margin-bottom: 1em; white-space: pre-line;">${formattedTextInfo}</div>

    <p><strong>Other Details:</strong></p>
    <ul style="list-style: none; padding-left: 0;">
      <li><strong>Severity:</strong> ${severity}</li>
      <li><strong>Is RCA required?:</strong> ${rca}</li>
      <li><strong>Department:</strong> ${departmentName}</li>
    </ul>
  </div>
`;
} 
else if (requestType === 'reassign_sme') 
  {
const severity = document.getElementById('severity').value;

const rawTextInfo = quill.getText().trim();
const cleanedTextInfo = rawTextInfo.replace(/\n/g, '<br>');

const delta = quill.getContents();
let formattedTextInfo = '';

delta.ops.forEach(op => {
if (op.insert.mention) {
  const { id } = op.insert.mention;
  formattedTextInfo += `zsu[@user:${id}]zsu`;
} else if (typeof op.insert === 'string') {
  // Replace newlines in inserted text with <br> to preserve formatting
  formattedTextInfo += op.insert.replace(/\n/g, '<br>');
}
});

// Convert newlines to <br> for HTML
const htmlFormattedText = formattedTextInfo.replace(/\n/g, '<br>');


commentContent = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <p><strong>Reassign Details:</strong></p>
    <ul style="list-style: none; padding-left: 0; margin-bottom: 1em;">
      <li><strong>ZUID:</strong> ${zuid}</li>
      <li><strong>ZGID:</strong> ${zgid}</li>
    </ul>

    <p><strong>Comment:</strong></p>
    <div style="margin-left: 1rem; margin-bottom: 1em; white-space: pre-line;">${formattedTextInfo}</div>

    <p><strong>Other Details:</strong></p>
    <ul style="list-style: none; padding-left: 0;">
      <li><strong>Severity:</strong> ${severity}</li>
      <li><strong>Is RCA required?:</strong> ${rca}</li>
      <li><strong>Department:</strong> ${departmentName}</li>
    </ul>
  </div>
`;
}
  
      if (failedFiles.length > 0) 
          {
          commentContent += `<p><strong>Warning:</strong> The following files failed to upload and are not attached:</p><ul>${failedFiles.map(file => `<li>${file}</li>`).join('')}</ul>`;
      }
      const commentPayload = { content: commentContent, commenterId: userid };
      console.log("commentPayload:", commentPayload);

      if (attachmentIds.length > 0) 
          {
          commentPayload.attachmentIds = attachmentIds;
      }
      // Add the comment to the ticket
      // try {
      //   const deskcomment=  await ZOHODESK.request
      //   ({
      //         url: `https://desk.zoho.com/api/v1/tickets/${ticketId}/comments`,
      //         headers: { 'Content-Type': 'application/json' },
      //         type: 'POST',
      //         postBody: JSON.stringify(commentPayload),
      //         connectionLinkName: 'smeextension'
      //     });
      //     console.log("Comment Added:", deskcomment);

      //     console.log("Comment Added Successfully.");
      // } 
      // catch (error) 
      // {
      //     console.error("Error adding the ticket:", error);
      // }
      
      // --- Ticket Manipulation ---
      let departmentId, teamid, requestBody;
      const dc = document.getElementById('dc').value; // Get DC and Severity again, if needed
      const severity = document.getElementById('severity').value;

      let moveSuccess = false;


      if (service === 'zoho_crm') 
          {
          departmentId = "4000000010045";
      } 
      else if (service === 'zoho_bigin') 
          {
      departmentId = "4001558193077"; // Zoho Bigin department ID
      }
      // --- Move Ticket (Critical) ---
      if (departmentId) 
          {
          // --- If moving to Partner Support department ---
          if (departmentName === "Partner Support") 
            {
              try {
                  // Add SME Assistance tag
                  await ZOHODESK.request({
                      url: `https://desk.zoho.com/api/v1/tickets/${ticketId}/associateTag`,
                      type: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      postBody: JSON.stringify({ tags: ["SME Assistance"] }),
                      connectionLinkName: userlevel
                  });
                  console.log("Tag Added Successfully (Partner Support).");
              } catch (error) {
                  console.error("Error adding tag to ticket (non-critical):", error);
                  await logErrorToCRM({ error, ticketnumber, userEmail, departmentName, adminlevel });
              }
      
              // Build service name for custom field
              const serviceMap = {
                  zoho_crm: "Zoho CRM",
                  zoho_bigin: "Bigin"
              };
              const servicename = serviceMap[service] || "Unknown Service";
      
              const partnerRequestBody = {
                  FIELD_UPDATE: {
                      customFields: {
                          cf_moved_to_department_central_partner_support: servicename
                      }
                  }
              };
      
              try {
                  const PartnerTransitionSuccessful = await ZOHODESK.request({
                      url: `https://support.zoho.com/api/v1/tickets/${ticketId}/transitions/4020338050335/perform`,
                      headers: {
                          'Content-Type': 'application/json',
                          'orgId': '4241905'
                      },
                      type: 'POST',
                      postBody: JSON.stringify(partnerRequestBody),
                      connectionLinkName: userlevel
                  });
                  console.log("Partner Transition Successful:", PartnerTransitionSuccessful);
              } catch (error) 
              {
                  console.error("Error while performing the partner transition:", error);
                  await logErrorToCRM({ error, ticketnumber, userEmail, departmentName });
              }
          } 
          else {
              // If not Partner Support, still add tag
              try {
                  await ZOHODESK.request({
                      url: `https://desk.zoho.com/api/v1/tickets/${ticketId}/associateTag`,
                      type: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      postBody: JSON.stringify({ tags: ["SME Assistance"] }),
                      connectionLinkName: userlevel
                  });
                  console.log("Tag Added Successfully.");
              } 
              catch (error) 
              {
                  console.error("Error adding tag to ticket (non-critical):", error);
                  await logErrorToCRM({ error, ticketnumber, userEmail, departmentName });
              }
          }
      
          // --- Move the ticket to the new department ---
          console.log("Moving ticket to departmentId:", departmentId);
      
          try {
              const movedepartment = await ZOHODESK.request({
                  url: `https://desk.zoho.com/api/v1/tickets/${ticketId}/move`,
                  headers: { 'Content-Type': 'application/json' },
                  type: 'POST',
                  postBody: JSON.stringify({ departmentId }),
                  connectionLinkName: userlevel
              });
      
             
              console.log("✅ Ticket moved successfully");
              console.log(movedepartment);
              moveSuccess = true;

          } catch (error) 
          {
              console.error("Error moving the ticket:", error);
              await logErrorToCRM({ error, ticketnumber, userEmail, departmentName });
          }
      }

  // Step 1: Assign ticket owner
requestBody = { assigneeId: userid };
let updateSuccess = false;

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
    updateSuccess = true;

} catch (error) 
{
    console.error("❌ Error updating ticket:", error);
    await logErrorToCRM({ error, ticketnumber, userEmail, departmentName });
    updateSuccess = false;
}
// Step 3: Log transition details in CRM
payload = {
  data: [{
      Name: "SME Assistance Extension",
      Log_Message: `📌 Before Blueprint Call\n\nCRM Request Body:\nService: ${service}`,
      Reference: `ticketnumber: ${ticketnumber}\nuserEmail: ${userEmail}\ndepartmentName: ${departmentName}`
  }]
};
const createError = await ZOHODESK.request({
  url: 'https://www.zohoapis.com/crm/v7/Error_Logs',
  headers: { 'Content-Type': 'application/json' },
  type: 'POST',
  postBody: JSON.stringify(payload),
  connectionLinkName: adminlevel
});

console.log("📨 Error log creation response:", createError);

// Step 2: Prepare blueprint transition body
let crmRequestBody, transitionUrl, transitionBody;

if (service === 'zoho_crm')
  {
    const customFields = {
        cf_zoho_service_name: "Zoho CRM",
        cf_severity: severity,
        cf_data_center: requestType === "reassign_sme" ? (cf_data_center ?? "US") : dc,
        cf_region: requestType === "reassign_sme" ? (cf_region ?? "US") : region,
        cf_request_from: requestType === "reassign_sme" ? (cf_request_from ?? "Paid User") : requestForm,
        cf_rca_available: rca,
        cf_related_project: zgid,
        cf_desk_dept_to_be_moved_back: deptBackground
    };

    crmRequestBody = {
        COMMENT: { isPublicComment: false, content: commentContent, uploads: attachmentIds },
        FIELD_UPDATE: {
            category: "General",
            subCategory: "Others",
            assigneeId: null,
            teamId: "4010745944203",
            customFields
        }
    };

    transitionUrl = `https://support.zoho.com/api/v1/tickets/${ticketId}/transitions/4004822377756/perform`;
    transitionBody = crmRequestBody;

} else if (service === 'zoho_bigin') {
    const customFields = {
        cf_data_center: requestType === "reassign_sme" ? (cf_data_center ?? "US") : dc,
        cf_severity: severity
    };

    transitionBody = {
        COMMENT: { isPublicComment: false, content: commentContent, uploads: attachmentIds },
        FIELD_UPDATE: {
            assigneeId: null,
            teamId: "4012158145739",
            category: "Activities",
            customFields
        }
    };

    transitionUrl = `https://support.zoho.com/api/v1/tickets/${ticketId}/transitions/4007838606904/perform`;
} 
else 
{
    console.warn("⚠️ Unknown service specified:", service);
    transitionUrl = null;
    transitionBody = null;

  // Step 3: Log transition details in CRM
payload = {
  data: [{
      Name: "SME Assistance Extension",
      Log_Message: `${JSON.stringify(crmRequestBody)}\n${transitionUrl}\n${JSON.stringify(transitionBody)}\nService: ${service}`,
      Reference: `ticketnumber: ${ticketnumber}\nuserEmail: ${userEmail}\ndepartmentName: ${departmentName}`
  }]
};

const createError = await ZOHODESK.request({
  url: 'https://www.zohoapis.com/crm/v7/Error_Logs',
  headers: { 'Content-Type': 'application/json' },
  type: 'POST',
  postBody: JSON.stringify(payload),
  connectionLinkName: adminlevel
});

console.log("📨 Error log creation response:", createError);
}

// Step 4: Perform Blueprint Transition (with retry mechanism)
if (transitionUrl && transitionBody) 
  {
    let transitionSuccess = false;
    let maxRetries = 2;
    let attempt = 0;

    console.log("🌐 Transition URL:", transitionUrl);
    console.log("📦 Transition Payload:", JSON.stringify(transitionBody, null, 2));

    while (!transitionSuccess && attempt < maxRetries) 
      {
        console.log('transitionUrl>>',transitionUrl);
        console.log('transitionBody>>',JSON.stringify(transitionBody));

        payload = {
          data: [{
              Name: "SME Assistance Extension",
              Log_Message: `📌 during Blueprint Call\n\n${JSON.stringify(crmRequestBody)}\n${transitionUrl}\n${JSON.stringify(transitionBody)}\nService: ${service}`,
              Reference: `ticketnumber: ${ticketnumber}\nuserEmail: ${userEmail}\ndepartmentName: ${departmentName}`
          }]
        };
        const createError = await ZOHODESK.request({
          url: 'https://www.zohoapis.com/crm/v7/Error_Logs',
          headers: { 'Content-Type': 'application/json' },
          type: 'POST',
          postBody: JSON.stringify(payload),
          connectionLinkName: adminlevel
        });

        attempt++;
        try {
            console.log(`🔁 Attempt ${attempt}: Performing Blueprint Transition...`);
            const transitionResponse = await ZOHODESK.request({
                url: transitionUrl,
                headers: {
                    'Content-Type': 'application/json',
                    'orgId': '4241905'
                },
                type: 'POST',
                postBody: JSON.stringify(transitionBody),
                connectionLinkName: userlevel
            });

            console.log("📨 Raw Transition Response:", transitionResponse);
            const parsed = JSON.parse(JSON.parse(transitionResponse).response);
            const statusMessage = parsed?.statusMessage;

            if (statusMessage?.errorCode) {
                console.warn("⚠️ Blueprint Transition Error:", statusMessage.errorCode);
                throw new Error(statusMessage.message || "Unknown blueprint transition failure.");
            }

            console.log("✅ Blueprint transition successful.");
            transitionSuccess = true;

            ZOHODESK.notify({
                content: "✅ Request moved successfully!",
                icon: "success",
                autoClose: true
            });

            form.reset();
            filesArray = [];
            fileInput.value = '';
            updateFileList();

            document.getElementById('overlay-loader').style.display = 'none';
            submitBtn.disabled = false;

            ZOHODESK.invoke("ROUTE_TO", "ticket.properties");
            location.reload();
            break;

        } catch (error) {
            console.error(`❌ Transition Attempt ${attempt} Failed:`, error.message);

            const transientErrors = ["timeout", "rate limit", "network", "something went wrong"];
            const safeToRetry = transientErrors.some(term => error.message.toLowerCase().includes(term));

            if (attempt >= maxRetries || !safeToRetry) {
                console.error("🛑 Max retries reached or non-retryable error.");
                await logErrorToCRM({ error, ticketnumber, userEmail, departmentName });

                ZOHODESK.notify({
                    title: "Transition Error",
                    content: `Blueprint transition failed: ${error.message}`,
                    icon: "error",
                    autoClose: true
                });

                document.getElementById('overlay-loader').style.display = 'none';
                submitBtn.disabled = false;

                const failedSteps = [];
                if (!updateSuccess) failedSteps.push("Update Owner");
                failedSteps.push("Blueprint Transition");

                alert(`❌ Ticket process failed at: ${failedSteps.join(", ")}`);
                break;
            }

            console.log("⏳ Retrying in 2 seconds...");
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

}
}
  catch (error) 
  {
      // --- Main Error Catcher ---
      console.error('--- SME ASSISTANCE ERROR LOG ---');
      console.error('Timestamp (UTC):', new Date().toISOString());
      // console.error('Timestamp (IST):', getISTTimestamp());
      console.error('Error Type:', error.name);
      console.error('Error Message:', error.message);
      console.error('Stack Trace:', error.stack);
      console.error('error:', error);
      console.error('--- END ERROR LOG ---');

      ZOHODESK.notify({
          title: "Error",
          content: `Submission Failed: ${error.message}. Please check the console for detailed logs.`,
          icon: "error",
          autoClose: true // Keep true, or set to false/longer duration for errors.
      });

      // Hide loader and re-enable button
      document.getElementById('overlay-loader').style.display = 'none';
      submitBtn.disabled = false;

      await logErrorToCRM({
          error,
          ticketnumber,
          userEmail,
          departmentName
      });

  }
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
    const ticket = res.ticket;

    ticketId = ticket.id;
    ticketnumber = ticket.number;
    ticketurl = ticket.link;
    channel = ticket.channel;
    cf_data_center = ticket.cf.cf_data_center;
    cf_region = ticket.cf.cf_region;
    cf_request_from = ticket.cf.cf_request_from;

    console.log("Ticket ID:", ticketId);
    console.log("Ticket Number:", ticketnumber);
    console.log("Ticket URL:", ticketurl);
    console.log("Channel:", channel);
    console.log("cf_request_from:", cf_request_from);
    console.log("cf_data_center:", cf_data_center);
    console.log("cf_region:", cf_region);

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
      } 
      else 
      {
        console.log("No CRM records found.");
      }
    } 
    catch (e) 
    {
      console.error("Error parsing SME response:", e);
      await logErrorToCRM({ error: e, ticketnumber, userEmail, departmentName, adminlevel });
    }

    // Get department name
    const deptResponse = await ZOHODESK.get("department.info", { id: ticket.departmentId });
    const departmentInfo = deptResponse["department.info"];
    if (departmentInfo && departmentInfo.length > 0)
       {
      departmentName = departmentInfo[0].name;
      console.log("Department Name:", departmentName);

     // const deptBackWrapper = document.getElementById("deptback-wrapper");
      // deptBackWrapper.style.display = departmentName === "Zoho CRM" ? "block" : "none";
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