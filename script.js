// Wait for the page to fully load
document.addEventListener('DOMContentLoaded', function() {
    // Form elements
    const form = document.getElementById('inspectionForm');
    const designVariationsRadios = document.getElementsByName('designVariations');
    const designVariationsDetails = document.getElementById('designVariationsDetails');
    const permissionSelect = document.getElementById('permissionToTrade');
    const caveatsSection = document.getElementById('caveatsSection');
    const showMoreCaveatsBtn = document.getElementById('showMoreCaveatsBtn');
    const additionalCaveats = document.getElementById('additionalCaveats');
    const generatePdfBtn = document.getElementById('generatePdfBtn');
    const saveLocalBtn = document.getElementById('saveLocalBtn');
    const clearFormBtn = document.getElementById('clearFormBtn');
    const visualChecksImagesInput = document.getElementById('visualChecksImages');
    const visualChecksImagesPreview = document.getElementById('visualChecksImagesPreview');
    
    // Store uploaded images
    let uploadedImages = [];
    
    // Register service worker for offline functionality
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed', err));
    }
    
    // ====== DATE CALCULATION ======
    
    // Auto-calculate expiry date when LC05 date changes
    document.getElementById('dateOfLC05').addEventListener('change', function() {
        const lc05Date = new Date(this.value);
        if (!isNaN(lc05Date.getTime())) {
            const expiryDate = new Date(lc05Date);
            expiryDate.setDate(expiryDate.getDate() + 30);
            
            // Format date as YYYY-MM-DD for input field
            const year = expiryDate.getFullYear();
            const month = String(expiryDate.getMonth() + 1).padStart(2, '0');
            const day = String(expiryDate.getDate()).padStart(2, '0');
            
            document.getElementById('dateOfExpiry').value = `${year}-${month}-${day}`;
        }
    });
    
    // ====== SIGNATURE PAD FUNCTIONALITY ======
    
    // Store all signature pads
    const signaturePads = {};
    const canvases = document.querySelectorAll('.signature-pad');
    
    // Initialize each signature pad
    canvases.forEach(canvas => {
        const ctx = canvas.getContext('2d');
        const id = canvas.id;
        
        // Set white background
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Create signature pad object
        signaturePads[id] = {
            canvas: canvas,
            ctx: ctx,
            drawing: false,
            lastX: 0,
            lastY: 0,
            empty: true
        };
        
        // Set drawing style
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        
        // Mouse events
        canvas.addEventListener('mousedown', e => startDrawing(e, id));
        canvas.addEventListener('mousemove', e => draw(e, id));
        canvas.addEventListener('mouseup', () => stopDrawing(id));
        canvas.addEventListener('mouseout', () => stopDrawing(id));
        
        // Touch events for iPad
        canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            startDrawing(mouseEvent, id);
        });
        
        canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            draw(mouseEvent, id);
        });
        
        canvas.addEventListener('touchend', () => stopDrawing(id));
    });
    
    // Signature drawing functions
    function startDrawing(e, canvasId) {
        const pad = signaturePads[canvasId];
        const rect = pad.canvas.getBoundingClientRect();
        pad.drawing = true;
        pad.lastX = e.clientX - rect.left;
        pad.lastY = e.clientY - rect.top;
        pad.empty = false;
    }
    
    function draw(e, canvasId) {
        const pad = signaturePads[canvasId];
        if (!pad.drawing) return;
        
        const rect = pad.canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        pad.ctx.beginPath();
        pad.ctx.moveTo(pad.lastX, pad.lastY);
        pad.ctx.lineTo(currentX, currentY);
        pad.ctx.stroke();
        
        pad.lastX = currentX;
        pad.lastY = currentY;
    }
    
    function stopDrawing(canvasId) {
        signaturePads[canvasId].drawing = false;
    }
    
    // Clear signature buttons
    document.querySelectorAll('.clear-signature').forEach(button => {
        button.addEventListener('click', function() {
            if (this.id === 'showMoreCaveatsBtn') {
                additionalCaveats.classList.toggle('hidden');
                this.textContent = additionalCaveats.classList.contains('hidden') ? 
                    'Show More Caveats' : 'Hide Extra Caveats';
                return;
            }
            
            const canvasId = this.getAttribute('data-target');
            const pad = signaturePads[canvasId];
            pad.ctx.fillStyle = '#fff';
            pad.ctx.fillRect(0, 0, pad.canvas.width, pad.canvas.height);
            pad.empty = true;
        });
    });
    
    // ====== IMAGE UPLOAD ======
    
    visualChecksImagesInput.addEventListener('change', function(e) {
        const files = e.target.files;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.match('image.*')) continue;
            
            const reader = new FileReader();
            reader.onload = (function(file) {
                return function(e) {
                    // Create preview elements
                    const previewDiv = document.createElement('div');
                    previewDiv.className = 'image-preview-wrapper';
                    
                    const img = document.createElement('img');
                    img.className = 'image-preview';
                    img.src = e.target.result;
                    
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'remove-image';
                    removeBtn.innerHTML = '✕';
                    removeBtn.dataset.filename = file.name;
                    
                    removeBtn.addEventListener('click', function() {
                        uploadedImages = uploadedImages.filter(img => img.name !== this.dataset.filename);
                        previewDiv.remove();
                    });
                    
                    previewDiv.appendChild(img);
                    previewDiv.appendChild(removeBtn);
                    visualChecksImagesPreview.appendChild(previewDiv);
                    
                    // Store image data
                    uploadedImages.push({
                        name: file.name,
                        data: e.target.result
                    });
                };
            })(file);
            
            reader.readAsDataURL(file);
        }
    });
    
    // ====== CONDITIONAL FORM SECTIONS ======
    
    // Show/hide design variations details
    for (let radio of designVariationsRadios) {
        radio.addEventListener('change', function() {
            designVariationsDetails.classList.toggle('hidden', this.value !== 'Yes');
        });
    }
    
    // Show/hide caveats section based on approval status
    permissionSelect.addEventListener('change', function() {
        caveatsSection.classList.toggle('hidden', this.value !== 'Approved with Caveats');
    });
    
    // ====== PDF GENERATION ======
    
    generatePdfBtn.addEventListener('click', function() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        // Page dimensions
        const pageWidth = 210; // A4 width in mm
        const rightMargin = 15; // Right margin in mm
        
        // Add title and Network Rail styling
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(0, 47, 108); // Network Rail blue
        doc.text('LC05 Temporary Trading Certificate', 105, 20, { align: 'center' });
        
        // Add blue line under title
        doc.setDrawColor(0, 47, 108);
        doc.setLineWidth(0.5);
        doc.line(15, 25, 195, 25);
        
        let yPosition = 35;
        
        // Set regular font for content
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        
        // Helper functions for PDF - UPDATED WITH RIGHT-ALIGNED ANSWERS
        function addField(label, value) {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
            }
            
            // Set fixed positions
            const labelX = 15;    // Left margin for labels
            const labelMaxWidth = 110; // Maximum width for label text
            const valueX = pageWidth - rightMargin; // Position answers close to right edge
            
            // Calculate space needed for long labels
            const labelLines = doc.splitTextToSize(label + ':', labelMaxWidth);
            
            // Keep font size consistent for all text
            doc.setFontSize(11);
            
            // Add the label in bold
            doc.setFont('helvetica', 'bold');
            doc.text(labelLines, labelX, yPosition);
            
            // Add the value in normal text (right-aligned)
            doc.setFont('helvetica', 'normal');
            doc.text(`${value || 'N/A'}`, valueX, yPosition, { align: 'right' });
            
            // Add more space if the label takes multiple lines
            const lineSpacing = 7;  // Space between entries
            const extraSpace = Math.max(0, (labelLines.length - 1) * lineSpacing);
            yPosition += lineSpacing + extraSpace;
        }
        
        function addSection(title) {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
            }
            
            yPosition += 5;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(0, 47, 108);
            doc.text(title, 15, yPosition);
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(11);
            yPosition += 8;
            
            doc.setDrawColor(91, 123, 188);
            doc.setLineWidth(0.2);
            doc.line(15, yPosition-4, 195, yPosition-4);
        }
        
        // Add sections to PDF
        addSection('Information');
        addField('Station', document.getElementById('station').value);
        addField('Retailer (Brand) Name', document.getElementById('retailerName').value);
        addField('Brand Designer', document.getElementById('brandDesigner').value);
        addField('Brand Fit-Out Contractor', document.getElementById('brandFitOutContractor').value);
        addField('Application Tracking Number', document.getElementById('applicationTrackingNumber').value);
        addField('Date of LC05', document.getElementById('dateOfLC05').value);
        addField('Proposed first day of trading', document.getElementById('proposedFirstDayOfTrading').value);
        addField('Date of expiry (30 days)', document.getElementById('dateOfExpiry').value);
        
        addSection('Design Variation');
        const designVariationsValue = document.querySelector('input[name="designVariations"]:checked')?.value || 'N/A';
        addField('Minor Design Variations', designVariationsValue);
        if (designVariationsValue === 'Yes') {
            addField('Proof of approval', document.getElementById('variationDetails').value);
        }
        
        // Add Mandatory Documentation section
        addSection('Mandatory Documentation for Unit Opening');
        
        // Loop through all selects in this section to add them to PDF
        const mandatoryDocSection = document.querySelector('.form-section:nth-of-type(3)');
        const mandatorySelects = mandatoryDocSection.querySelectorAll('select');
        mandatorySelects.forEach(select => {
            const label = select.previousElementSibling.textContent.replace(':', '');
            addField(label, select.value);
        });
        
        // Add Visual Checks section
        addSection('Visual Checks to be carried out by NR');
        
        // Loop through main visual check fields
        const visualChecksSection = document.querySelector('.form-section:nth-of-type(4)');
        const visualSelects = visualChecksSection.querySelectorAll('select');
        visualSelects.forEach(select => {
            const label = select.previousElementSibling.textContent.replace(':', '');
            addField(label, select.value);
        });
        
        // Add meter readings
        addField('Electricity Meter Reading', document.getElementById('electricityMeterReading').value);
        addField('Water Meter Reading', document.getElementById('waterMeterReading').value);
        
        // If there are uploaded images
        if (uploadedImages.length > 0) {
            addField('Visual Check Images', 'See attached images');
            
            // Add each image on a new page
            uploadedImages.forEach((image, index) => {
                doc.addPage();
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(14);
                doc.text(`Visual Check Image ${index + 1}`, 105, 20, { align: 'center' });
                
                try {
                    doc.addImage(image.data, 'JPEG', 15, 30, 180, 180, '', 'MEDIUM');
                } catch (error) {
                    console.error('Error adding image to PDF:', error);
                }
            });
            
            doc.addPage();
            yPosition = 20;
        }
        
        // Add LC05 Status Section
        addSection('LC05 Status');
        addField('LC05 Approval Status', document.getElementById('permissionToTrade').value);
        
        // Add signatures to PDF if they exist
        addSection('Signatures');
        
        // Array of signature fields with their details
        const signatureFields = [
            { id: 'assetEngineerSignature', nameId: 'assetEngineer', role: 'Asset Engineer' },
            { id: 'stationRepSignature', nameId: 'stationRep', role: 'Station Representative' },
            { id: 'fireSafetyEngineerSignature', nameId: 'fireSafetyEngineer', role: 'Fire Safety Engineer' },
            { id: 'facilitiesSurveyorSignature', nameId: 'facilitiesSurveyor', role: 'Facilities Surveyor' }
        ];
        
        // Add each signature
        signatureFields.forEach(field => {
            if (!signaturePads[field.id].empty) {
                // Create space between signatures
                yPosition += 5;
                
                if (yPosition > 230) {
                    doc.addPage();
                    yPosition = 30;
                }
                
                const signatureName = document.getElementById(field.nameId).value;
                const signatureDataUrl = signaturePads[field.id].canvas.toDataURL('image/png');
                
                doc.addImage(signatureDataUrl, 'PNG', 15, yPosition, 80, 40);
                
                yPosition += 45;
                doc.setFont('helvetica', 'bold');
                doc.text(field.role, 15, yPosition);
                yPosition += 7;
                doc.setFont('helvetica', 'normal');
                doc.text(`Name: ${signatureName || 'N/A'}`, 15, yPosition);
                
                yPosition += 15;
            }
        });
        
        // Add Caveats Section if applicable
        if (document.getElementById('permissionToTrade').value === 'Approved with Caveats') {
            addSection('Caveats (to be completed within 30 days)');
            
            // Get all caveat input fields
            const caveatInputs = caveatsSection.querySelectorAll('input[type="text"]');
            
            // Filter out empty caveats
            let caveatNumber = 1;
            caveatInputs.forEach(input => {
                if (input.value.trim()) {
                    addField(`Caveat ${caveatNumber}`, input.value);
                    caveatNumber++;
                }
            });
        }
        
        // Add date at the bottom
        yPosition += 10;
        const today = new Date();
        const dateStr = today.toLocaleDateString();
        doc.setFont('helvetica', 'bold');
        doc.text(`Date: ${dateStr}`, 15, yPosition);
        
        // Add page numbers
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
        }
        
        // Save the PDF
        const fileName = `LC05_Certificate_${document.getElementById('retailerName').value || 'Form'}_${dateStr.replace(/\//g, '-')}.pdf`;
        doc.save(fileName);
    });
    
    // ====== SAVE & LOAD FORM DATA ======
    
    // Save form data locally
    saveLocalBtn.addEventListener('click', function() {
        const formData = {};
        
        // Get all form inputs
        const inputs = form.querySelectorAll('input:not([type="file"]), select');
        
        // Store each input value
        inputs.forEach(input => {
            if (input.type === 'radio') {
                if (input.checked) {
                    formData[input.name] = input.value;
                }
            } else {
                formData[input.name] = input.value;
            }
        });
        
        // Store signatures
        Object.keys(signaturePads).forEach(id => {
            if (!signaturePads[id].empty) {
                formData[id] = signaturePads[id].canvas.toDataURL('image/png');
            }
        });
        
        // Store images
        formData.uploadedImages = uploadedImages;
        
        // Add timestamp
        formData.timestamp = new Date().toISOString();
        formData.formId = 'LC05_' + Date.now();
        
        // Save in localStorage
        const savedForms = JSON.parse(localStorage.getItem('savedForms')) || [];
        savedForms.push(formData);
        localStorage.setItem('savedForms', JSON.stringify(savedForms));
        
        alert('Form saved successfully!');
    });
    
    // Load most recent form on page load
    function loadMostRecentForm() {
        const savedForms = JSON.parse(localStorage.getItem('savedForms')) || [];
        if (savedForms.length === 0) return;
        
        // Sort by timestamp descending
        savedForms.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const formData = savedForms[0];
        
        // Fill all form fields
        Object.keys(formData).forEach(key => {
            // Skip non-form fields
            if (['timestamp', 'formId', 'uploadedImages'].includes(key)) return;
            
            // Handle signatures
            if (key.includes('Signature')) {
                if (formData[key]) {
                    const img = new Image();
                    img.onload = function() {
                        const pad = signaturePads[key];
                        pad.ctx.drawImage(img, 0, 0);
                        pad.empty = false;
                    };
                    img.src = formData[key];
                }
                return;
            }
            
            // Handle regular form fields
            const element = document.getElementById(key);
            if (!element) return;
            
            if (element.type === 'radio') {
                const radio = document.querySelector(`input[name="${key}"][value="${formData[key]}"]`);
                if (radio) {
                    radio.checked = true;
                    // Trigger change event
                    const event = new Event('change');
                    radio.dispatchEvent(event);
                }
            } else {
                element.value = formData[key];
                // Trigger change event for select elements
                if (element.tagName === 'SELECT') {
                    const event = new Event('change');
                    element.dispatchEvent(event);
                }
            }
        });
        
        // Load images
        if (formData.uploadedImages && formData.uploadedImages.length > 0) {
            uploadedImages = formData.uploadedImages;
            
            // Clear existing previews
            visualChecksImagesPreview.innerHTML = '';
            
            // Add image previews
            uploadedImages.forEach(image => {
                const previewDiv = document.createElement('div');
                previewDiv.className = 'image-preview-wrapper';
                
                const img = document.createElement('img');
                img.className = 'image-preview';
                img.src = image.data;
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-image';
                removeBtn.innerHTML = '✕';
                removeBtn.dataset.filename = image.name;
                
                removeBtn.addEventListener('click', function() {
                    uploadedImages = uploadedImages.filter(img => img.name !== this.dataset.filename);
                    previewDiv.remove();
                });
                
                previewDiv.appendChild(img);
                previewDiv.appendChild(removeBtn);
                visualChecksImagesPreview.appendChild(previewDiv);
            });
        }
    }
    
    // Load most recent form when page loads
    loadMostRecentForm();
});