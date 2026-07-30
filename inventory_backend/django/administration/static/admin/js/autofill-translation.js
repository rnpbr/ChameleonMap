document.addEventListener("DOMContentLoaded", function () {
    function getOriginalText() {
        const input = document.querySelector("#id_name");
        let originalText = "";
        
        if(input){
            originalText = input.value;
        }
        return originalText;        
    }

    function getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    }

    async function translateAndFill(nameField, targetLanguage) {
        const originalText = getOriginalText();
        if(originalText){            
            nameField.placeholder = "Translating...";
            
            try {
                const response = await fetch("/tools/translate-text/", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": getCSRFToken()
                    },
                    body: JSON.stringify({ 
                        text: originalText, 
                        target: targetLanguage 
                    })
                });
                
                const data = await response.json();
                
                if (data.translated) {
                    nameField.value = data.translated;
                    nameField.dataset.autoTranslated = "true";
                }
            } catch (error) {
                console.error(error);
            } finally {
                nameField.placeholder = "";
            }
        }
    } 

    document.addEventListener("change", function (event) {
        const changedField = event.target;
        const isLanguageField = changedField.name && changedField.name.includes("language_code");
        if(isLanguageField){
            const row = changedField.closest("tr, .form-row, .inline-related");
            if(row){
                const nameField = row.querySelector("input[name$='name']");
                if(nameField){
                    const userHasTypedManually = nameField.value && !nameField.dataset.autoTranslated;
                    if(!userHasTypedManually){
                        const selectedLanguage = changedField.value;
                        if(selectedLanguage){
                            translateAndFill(nameField, selectedLanguage);
                        }
                    }
                }
            }
        }
    });

    document.addEventListener("input", function (event) {
        const typedField = event.target;
        const isNameField = typedField.name && typedField.name.endsWith("name");
        if (isNameField) {
            delete typedField.dataset.autoTranslated;
        }
    });

});