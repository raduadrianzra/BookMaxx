const express= require("express");
const path= require("path");
const fs = require ("fs");
const sass = require("sass");
const { init } = require("express/lib/application");

app= express();
app.set("view engine", "ejs")

obGlobal={
    obErori: null,
    obImagini: null,
    folderScss: path.join(__dirname, "resurse/scss"),
    folderCss: path.join(__dirname, "resurse/css"),
    folderBackup: path.join(__dirname, "backup"),
}

console.log("Folder index.js", __dirname);
console.log("Folder curent (de lucru)", process.cwd());
console.log("Cale fisier", __filename);

let vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"]
for(let folder of vect_foldere){
    let caleFolder = path.join(__dirname, folder);
    if(!fs.existsSync(caleFolder)){
        fs.mkdirSync(path.join(caleFolder), {recursive: true});
    }
}

app.use("/resurse", express.static(path.join(__dirname, "resurse")));

app.get("/favicon.ico", function(req, res){
    res.sendFile(path.join(__dirname, "resurse/imagini/favicon/favicon.ico"))
});

//app.get("/:a/:b", function(req, res){
//    res.sendFile(path.join(__dirname, "index.html"));
//}); 

app.get(["/", "/index", "/home"], function(req, res){
    res.render("pagini/index", {
        ip: req.ip
    });
});

app.get("/", function(req, res){
    // res.sendFile(path.join(__dirname, "index.html"));
    res.render("pagini/index");
});

app.get("/despre", function(req, res){
    res.render("pagini/despre");
});

function detecteazaDuplicateJSON(jsonStr) {
    let i = 0;
    let erori = [];

    function saritSpatiuAlb() {
        while (i < jsonStr.length && /\s/.test(jsonStr[i])) i++;
    }

    function citesteString() {
        i++; // sare "
        let s = '';
        while (i < jsonStr.length) {
            if (jsonStr[i] === '\\') {
                i += 2; // sare caracterul escape
            } else if (jsonStr[i] === '"') {
                i++; // sare "
                return s;
            } else {
                s += jsonStr[i++];
            }
        }
        return s;
    }

    function parseazaValoare() {
        saritSpatiuAlb();
        if (i >= jsonStr.length) return;
        let c = jsonStr[i];
        if      (c === '{') parseazaObiect();
        else if (c === '[') parseazaArray();
        else if (c === '"') citesteString();
        else { // numar, boolean, null
            while (i < jsonStr.length && !/[\],}\s]/.test(jsonStr[i])) i++;
        }
    }

    function parseazaArray() {
        i++; // sare [
        saritSpatiuAlb();
        while (i < jsonStr.length && jsonStr[i] !== ']') {
            parseazaValoare();
            saritSpatiuAlb();
            if (jsonStr[i] === ',') i++;
            saritSpatiuAlb();
        }
        i++; // sare ]
    }

    function parseazaObiect() {
        i++; // sare {
        let cheiVazute = new Set();
        saritSpatiuAlb();
        while (i < jsonStr.length && jsonStr[i] !== '}') {
            saritSpatiuAlb();
            if (jsonStr[i] !== '"') break;
            let cheie = citesteString();
            if (cheiVazute.has(cheie)) {
                erori.push(`Proprietatea "${cheie}" apare de mai multe ori in acelasi obiect JSON din erori.json. Pastrati doar o singura aparitie a proprietatii.`);
            } else {
                cheiVazute.add(cheie);
            }
            saritSpatiuAlb();
            if (jsonStr[i] === ':') i++; // sare :
            parseazaValoare();
            saritSpatiuAlb();
            if (jsonStr[i] === ',') i++;
            saritSpatiuAlb();
        }
        i++; // sare }
    }

    saritSpatiuAlb();
    parseazaValoare();
    return erori;
}


function verificareErori() {
    let caleFisier = path.join(__dirname, "resurse/json/erori.json");
    if (!fs.existsSync(caleFisier)) {
        console.error(
            `[EROARE A] Fisierul erori.json NU EXISTA la calea: "${caleFisier}". ` +
            `Creati fisierul si reporniti serverul. Aplicatia se va inchide.`
        );
        process.exit();
    }

    let continut = fs.readFileSync(caleFisier).toString("utf-8");
    let eroriDuplicate = detecteazaDuplicateJSON(continut);
    for (let msg of eroriDuplicate) {
        console.error(`[EROARE F] ${msg}`);
    }
    let erori;
    try {
        erori = JSON.parse(continut);
    } catch (e) {
        console.error(
            `[EROARE] Fisierul erori.json contine JSON invalid: ${e.message}. ` +
            `Verificati sintaxa fisierului. Aplicatia se va inchide.`
        );
        process.exit();
    }
    let propLipsa = ['info_erori', 'cale_baza', 'eroare_default'].filter(p => !erori.hasOwnProperty(p));
    if (propLipsa.length > 0) {
        console.error(
            `[EROARE B] Fisierul erori.json NU contine urmatoarele proprietati obligatorii: ` +
            `${propLipsa.join(', ')}. Adaugati-le in erori.json. Aplicatia se va inchide.`
        );
        process.exit();
    }
    let propDefaultLipsa = ['titlu', 'text', 'imagine'].filter(p => !erori.eroare_default.hasOwnProperty(p));
    if (propDefaultLipsa.length > 0) {
        console.error(
            `[EROARE C] Obiectul "eroare_default" din erori.json nu contine urmatoarele proprietati: ` +
            `${propDefaultLipsa.join(', ')}. Adaugati-le in sectiunea "eroare_default" din erori.json.`
        );
    }
    let caleFolder = path.join(__dirname, erori.cale_baza);
    if (!fs.existsSync(caleFolder)) {
        console.error(
            `[EROARE D] Folderul specificat in "cale_baza" ("${erori.cale_baza}") ` +
            `NU EXISTA in sistemul de fisiere la calea: "${caleFolder}". ` +
            `Creati folderul sau corectati valoarea "cale_baza" din erori.json.`
        );
    }

    if (erori.eroare_default.imagine) {
        let caleImg = path.join(__dirname, erori.cale_baza, erori.eroare_default.imagine);
        if (!fs.existsSync(caleImg)) {
            console.error(
                `[EROARE E] Imaginea pentru "eroare_default" NU EXISTA la calea: "${caleImg}". ` +
                `Adaugati imaginea sau corectati proprietatea "imagine" din "eroare_default".`
            );
        }
    }
    for (let eroare of erori.info_erori) {
        if (eroare.imagine) {
            let caleImg = path.join(__dirname, erori.cale_baza, eroare.imagine);
            if (!fs.existsSync(caleImg)) {
                console.error(
                    `[EROARE E] Imaginea pentru eroarea cu identificatorul "${eroare.identificator}" ` +
                    `NU EXISTA la calea: "${caleImg}". ` +
                    `Adaugati imaginea sau corectati proprietatea "imagine" pentru aceasta eroare in erori.json.`
                );
            }
        }
    }
    let grupateIduri = {};
    for (let eroare of erori.info_erori) {
        let id = eroare.identificator;
        if (!grupateIduri[id]) grupateIduri[id] = [];
        grupateIduri[id].push(eroare);
    }
    for (let [id, lista] of Object.entries(grupateIduri)) {
        if (lista.length > 1) {
            let detalii = lista.map(e => {
                let { identificator, ...rest } = e;
                return JSON.stringify(rest, null, 2);
            }).join('\n  ---\n  ');
            console.error(
                `[EROARE G] Identificatorul "${id}" apare de ${lista.length} ori in "info_erori". ` +
                `Erorile duplicate (fara identificator):\n  ${detalii}\n` +
                `Pastrati doar un singur obiect cu acest identificator in erori.json.`
            );
        }
    }
}

function initErori(){
    let continut = fs.readFileSync(path.join(__dirname, "resurse/json/erori.json")).toString("utf-8");
    let erori = obGlobal.obErori = JSON.parse(continut);
    let err_default = erori.eroare_default;
    err_default.imagine = path.join(erori.cale_baza, err_default.imagine);
    for (let eroare of erori.info_erori){
        eroare.imagine = path.join(erori.cale_baza, eroare.imagine);
    }
}
verificareErori();
initErori();

function afisareEroare(res, identificator, titlu, text, imagine){
    let eroare = obGlobal.obErori.info_erori.find((elem) => 
        elem.identificator == identificator
    )

    let errDefault = obGlobal.obErori.eroare_default;
    if(eroare?.status)
        res.status(eroare.identificator)
    res.render("pagini/eroare", {
        imagine: imagine || eroare?.imagine || errDefault.imagine,
        titlu: titlu || eroare?.titlu || errDefault.titlu,
        text: text || eroare?.text || errDefault.text,    
    });
    
}

app.get("/eroare", function(req, res){
    afisareEroare(res,404, "titlu!!"); 
});

app.get("/cale", function(req, res){
    console.log("Am primit o cerere GET la adresa /cale");
    res.send("Raspuns la <b style = 'color: blue;'>cererea</b> GET la adresa /cale");
});

app.get("/cale2", function(req, res){
    res.write("ceva");
    res.write("altceva");
    res.end();
});

app.get("/cale2/:a/:b", function(req, res){
    res.send(parseInt(req.params.a)+parseInt(req.params.b));
});

app.get("/*pagina", function(req, res){
    console.log("Cale pagina", req.url);
    if(req.url.startsWith("/resurse") && path.extname(req.url) == ""){
        afisareEroare(res, 403);
        return;
    }
    if(path.extname(req.url) == ".ejs"){
        afisareEroare(res, 400);
        return;
    }
    try{
        res.render("pagini"+req.url, function(err, rezRandare){
            if(err){
                if(err.message.includes("Failed to lookup view")){
                    afisareEroare(res, 404);
                }
            else{
                    afisareEroare(res);
                }
            }
            else{
                res.send(rezRandare);
                console.log("Rezultat randare", rezRandare);
            }
        });
    }
    catch(err){
        if(err.message.includes("Cannot find module")){
            afisareEroare(res, 404)
        }
        else{
            afisareEroare(res);
        }
    }
});

app.listen(8080);
console.log("Serverul a pornit!");