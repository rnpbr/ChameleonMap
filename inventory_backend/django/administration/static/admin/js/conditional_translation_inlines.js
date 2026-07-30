document.addEventListener('DOMContentLoaded', function(){
    const translatableCheckbox = document.getElementById('id_translatable');
    
    if(translatableCheckbox) {   
        const titleTranslationsInlines = document.querySelector('[id*="nametranslation"]');        
        
        function redefineTranslationsInputVisibility() {
            if(titleTranslationsInlines){
                if(translatableCheckbox.checked){
                    titleTranslationsInlines.style.display = '';
                }else{
                    titleTranslationsInlines.style.display = 'none';
                }
            }
        }
        
        translatableCheckbox.addEventListener('change', redefineTranslationsInputVisibility);
        redefineTranslationsInputVisibility();
    }
});