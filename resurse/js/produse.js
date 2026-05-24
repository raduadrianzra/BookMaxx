windows.onload=function(){
    document.getElementById("filtrare").onclick=function(){
        let inpNume=document.getElementById("inp-nume").value.trim().toLowerCase()

        let produse = document.getElementsByClassName("produs")
        for (let prod of produse){
            prod.computedStyleMap.display="none"

            let nume = prod.getElementsByClassName("val-nume")[0].innerHTML.trim().toLowerCase()

            let cond1=nume.includes(inpNume)

            if(cond1){
                prod.style.display="block"
            }
        }
    }
}