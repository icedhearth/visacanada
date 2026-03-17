import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getStorage, getDownloadURL, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyAkBV0rHEghBOHl2mDOs6rMDHkUgYMxFr0",
    authDomain: "visaformulariostorage.firebaseapp.com",
    projectId: "visaformulariostorage",
    storageBucket: "visaformulariostorage.firebasestorage.app",
    messagingSenderId: "720170394408",
    appId: "1:720170394408:web:b1c294c39c489388f6261d"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const { jsPDF } = window.jspdf;

const form = document.getElementById("immForm");
const submitBtn = document.getElementById("submitBtn");
const clearBtn = document.getElementById("clearBtn");
const statusBox = document.getElementById("statusBox");
const WHATSAPP_NUMBER = "556199998165";

const clean = (v) => String(v || "").replace(/\r?\n+/g, " / ").replace(/[ \t]+/g, " ").trim();
const slug = (v) => clean(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "cliente";
const formatDateBr = (value) => {
    const v = clean(value);
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : (v || "Nao informado");
};
const mapYesNo = (v) => v === "Sim" ? "Yes" : v === "Nao" ? "No" : clean(v);
const tCountry = (v) => ({ brasil: "Brazil", canada: "Canada", eua: "United States", "estados unidos": "United States" })[clean(v).toLowerCase()] || clean(v);
const tGender = (v) => ({ Masculino: "Male", Feminino: "Female", Outro: "Other" })[v] || clean(v);
const tMarital = (v) => ({
    "Solteiro(a)": "Single",
    "Casado(a)": "Married",
    "Uniao estavel": "Common-Law",
    "Divorciado(a)": "Divorced",
    "Viuvo(a)": "Widowed",
    "Separado(a) legalmente": "Legally Separated",
    "Casamento anulado": "Annulled Marriage"
})[v] || clean(v);
const tStatus = (v) => ({ Cidadao: "Citizen", "Residente permanente": "Permanent Resident", Visitante: "Visitor", Trabalhador: "Worker", Estudante: "Student", Outro: "Other" })[v] || clean(v);
const tComm = (v) => ({ Nenhum: "Neither", Ingles: "English", Frances: "French", Ambos: "Both" })[v] || clean(v);
const tPhone = (v) => ({ Celular: "02", Residencial: "01", Comercial: "03" })[v] || clean(v);
const tPurpose = (v) => ({ Turismo: "Tourism", Negocios: "Business", "Visita a familiares": "Family Visit", Transito: "Transit", Outro: "Other" })[v] || clean(v);
const tLang = (v) => ({ portugues: "Portuguese", ingles: "English", frances: "French", espanhol: "Spanish" })[clean(v).toLowerCase()] || clean(v);

function splitAddress(value) {
    const full = clean(value);
    const match = full.match(/^(.*?)(?:,\s*| - )?(\d+[A-Za-z0-9/-]*)\s*(.*)$/);
    if (!match) return { streetName: full, streetNum: "", apt: "" };
    return {
        streetName: clean(match[1]),
        streetNum: clean(match[2]),
        apt: clean(match[3]).replace(/^(apt|apto|apartment|bloco|casa|cj)\s*/i, "")
    };
}

function toggleByRadio(name, targetId, showValue = "Sim") {
    const checked = form.querySelector(`input[name="${name}"]:checked`);
    document.getElementById(targetId).classList.toggle("hidden", !checked || checked.value !== showValue);
}

function toggleSpouse() {
    const value = form.querySelector("#maritalStatus").value;
    document.getElementById("spouseBox").classList.toggle("hidden", !(value === "Casado(a)" || value === "Uniao estavel"));
}

function toggleBg() {
    document.getElementById("bgBox").classList.toggle("hidden", ![...document.querySelectorAll(".bg")].some((el) => el.value === "Sim"));
}

function toggleEducation() {
    const checked = form.querySelector('input[name="hasEducation"]:checked');
    const show = !!checked && checked.value === "Sim";
    document.getElementById("eduBox").classList.toggle("hidden", !show);
    form.querySelectorAll("[data-edu-required='1']").forEach((field) => {
        field.required = show;
    });
}

function setStatus(type, msg) {
    statusBox.className = `status ${type}`;
    statusBox.textContent = msg;
}

function clearStatus() {
    statusBox.className = "status";
    statusBox.textContent = "";
}

function validateRequired() {
    clearStatus();
    for (const field of form.querySelectorAll("[required]")) {
        if (field.type === "checkbox") {
            if (!field.checked) {
                setStatus("error", "Para continuar, confirme a declaracao ao final do formulario.");
                field.focus();
                return false;
            }
        } else if (!clean(field.value)) {
            const label = field.closest(".field")?.querySelector("label")?.textContent || "Campo obrigatorio";
            setStatus("error", `Preencha o campo obrigatorio: ${label}`);
            field.focus();
            return false;
        }
    }
    return true;
}

function raw() {
    return Object.fromEntries(new FormData(form).entries());
}

function mapped() {
    const r = raw();
    const homeAddress = splitAddress(r.homeAddress1);
    const sameMail = mapYesNo(r.mailingSameAsHome) === "Yes";
    const mailAddress = sameMail ? homeAddress : splitAddress(r.mailAddress1);
    return {
        template: "IMM5257E",
        exportVersion: "2026-03-17",
        outputLanguage: "English-normalized-values",
        applicationLanguage: "English",
        applicationType: clean(r.applicationType),
        uci: clean(r.uci),
        lastName: clean(r.lastName),
        firstName: clean(r.firstName),
        alias: mapYesNo(r.alias),
        aliasLastName: clean(r.aliasLastName),
        aliasFirstName: clean(r.aliasFirstName),
        gender: tGender(r.gender),
        dob: clean(r.dob),
        birthCity: clean(r.birthCity),
        birthCountry: tCountry(r.birthCountry),
        citizenship: tCountry(r.citizenship),
        currentResidenceCountry: tCountry(r.currentResidenceCountry),
        currentResidenceStatus: tStatus(r.currentResidenceStatus),
        currentResidenceFrom: clean(r.currentResidenceFrom),
        nationalityExtra: clean(r.nationalityExtra),
        hadPreviousResidence: mapYesNo(r.hadPreviousResidence),
        prevCountry1: tCountry(r.prevCountry1),
        prevStatus1: tStatus(r.prevStatus1),
        prevFrom1: clean(r.prevFrom1),
        prevTo1: clean(r.prevTo1),
        prevCountry2: tCountry(r.prevCountry2),
        prevStatus2: tStatus(r.prevStatus2),
        prevFrom2: clean(r.prevFrom2),
        prevTo2: clean(r.prevTo2),
        nativeLang: tLang(r.nativeLang),
        canCommunicate: tComm(r.canCommunicate),
        maritalStatus: tMarital(r.maritalStatus),
        marriageDate: clean(r.marriageDate),
        spouseLastName: clean(r.spouseLastName),
        spouseFirstName: clean(r.spouseFirstName),
        spouseDob: clean(r.spouseDob),
        hadPreviousMarriage: mapYesNo(r.hadPreviousMarriage),
        previousSpouseName: clean(r.previousSpouseName),
        previousMarriageType: clean(r.previousMarriageType),
        previousMarriageFrom: clean(r.previousMarriageFrom),
        previousMarriageTo: clean(r.previousMarriageTo),
        passportNum: clean(r.passportNum),
        passportCountry: tCountry(r.passportCountry),
        issueDate: clean(r.issueDate),
        expiryDate: clean(r.expiryDate),
        nationalIdHas: mapYesNo(r.nationalIdHas),
        nationalIdNumber: clean(r.nationalIdNumber),
        nationalIdCountry: tCountry(r.nationalIdCountry),
        nationalIdIssueDate: clean(r.nationalIdIssueDate),
        nationalIdExpiryDate: clean(r.nationalIdExpiryDate),
        usVisa: mapYesNo(r.usVisa),
        canVisa: mapYesNo(r.canVisa),
        usPermanentResident: mapYesNo(r.usPermanentResident),
        usPrNumber: clean(r.usPrNumber),
        homeAddress1: clean(r.homeAddress1),
        homeApt: homeAddress.apt,
        homeStreetNum: homeAddress.streetNum,
        homeStreetName: homeAddress.streetName,
        homeCity: clean(r.homeCity),
        homeState: clean(r.homeState),
        homeProvince: clean(r.homeState),
        homePostalCode: clean(r.homePostalCode),
        homeCountry: tCountry(r.homeCountry),
        mailingSameAsHome: mapYesNo(r.mailingSameAsHome),
        mailAddress1: sameMail ? clean(r.homeAddress1) : clean(r.mailAddress1),
        mailApt: mailAddress.apt,
        mailStreetNum: mailAddress.streetNum,
        mailStreetName: mailAddress.streetName,
        mailCity: sameMail ? clean(r.homeCity) : clean(r.mailCity),
        mailState: sameMail ? clean(r.homeState) : clean(r.mailState),
        mailProvince: sameMail ? clean(r.homeState) : clean(r.mailState),
        mailPostalCode: sameMail ? clean(r.homePostalCode) : clean(r.mailPostalCode),
        mailCountry: sameMail ? tCountry(r.homeCountry) : tCountry(r.mailCountry),
        email: clean(r.email),
        phoneType: tPhone(r.phoneType),
        phoneCountryCode: clean(r.phoneCountryCode),
        phoneNumber: clean(r.phoneNumber),
        travelPurpose: tPurpose(r.travelPurpose),
        travelFrom: clean(r.travelFrom),
        travelTo: clean(r.travelTo),
        funds: clean(r.funds),
        payerTrip: clean(r.payerTrip),
        travelCompanion: clean(r.travelCompanion),
        canContactName: clean(r.canContactName),
        canContactRelationship: clean(r.canContactRelationship),
        canContactAddress: clean(r.canContactAddress),
        canContactPhone: clean(r.canContactPhone),
        intendedProvince: clean(r.intendedProvince),
        itinerary: clean(r.itinerary),
        travelPurposeOther: clean(r.travelPurposeOther),
        job1_title: clean(r.job1_title),
        job1_company: clean(r.job1_company),
        job1_city: clean(r.job1_city),
        job1_country: tCountry(r.homeCountry),
        job1_from: clean(r.job1_from),
        job1_to: "Present",
        job2_title: clean(r.job2_title),
        job2_company: clean(r.job2_company),
        job2_city: clean(r.job2_city),
        job2_country: tCountry(r.homeCountry),
        job2_from: clean(r.job2_from),
        job2_to: clean(r.job2_to),
        job3_title: clean(r.job3_title),
        job3_company: clean(r.job3_company),
        job3_city: clean(r.job3_city),
        job3_country: tCountry(r.homeCountry),
        job3_from: clean(r.job3_from),
        job3_to: clean(r.job3_to),
        job4_title: clean(r.job4_title),
        job4_company: clean(r.job4_company),
        job4_city: clean(r.job4_city),
        job4_country: tCountry(r.homeCountry),
        job4_from: clean(r.job4_from),
        job4_to: clean(r.job4_to),
        hasEducation: mapYesNo(r.hasEducation),
        eduLevel: clean(r.eduLevel),
        eduSchool: clean(r.eduSchool),
        eduField: clean(r.eduField),
        eduCity: clean(r.eduCity),
        eduCountry: tCountry(r.eduCountryInput || r.homeCountry),
        eduFrom: clean(r.eduFrom),
        eduTo: clean(r.eduTo),
        eduProvince: clean(r.eduProvince),
        bg1: mapYesNo(r.bg1),
        bg2: mapYesNo(r.bg2),
        bg3: mapYesNo(r.bg3),
        bg4: mapYesNo(r.bg4),
        bg5: mapYesNo(r.bg5),
        bg6: mapYesNo(r.bg6),
        bg7: mapYesNo(r.bg7),
        bg8: mapYesNo(r.bg8),
        bgExplanation: clean(r.bgExplanation)
    };
}

function buildTxt() {
    const d = mapped();
    const groups = [
        ["# Metadata", ["template", "exportVersion", "outputLanguage", "applicationLanguage", "applicationType", "uci"]],
        ["# Personal", ["lastName", "firstName", "alias", "aliasLastName", "aliasFirstName", "gender", "dob", "birthCity", "birthCountry", "citizenship", "currentResidenceCountry", "currentResidenceStatus", "currentResidenceFrom", "nationalityExtra"]],
        ["# ResidenceAndFamily", ["hadPreviousResidence", "prevCountry1", "prevStatus1", "prevFrom1", "prevTo1", "prevCountry2", "prevStatus2", "prevFrom2", "prevTo2", "nativeLang", "canCommunicate", "maritalStatus", "marriageDate", "spouseLastName", "spouseFirstName", "spouseDob", "hadPreviousMarriage", "previousSpouseName", "previousMarriageType", "previousMarriageFrom", "previousMarriageTo"]],
        ["# DocumentsAndContact", ["passportNum", "passportCountry", "issueDate", "expiryDate", "nationalIdHas", "nationalIdNumber", "nationalIdCountry", "nationalIdIssueDate", "nationalIdExpiryDate", "usVisa", "canVisa", "usPermanentResident", "usPrNumber", "homeAddress1", "homeApt", "homeStreetNum", "homeStreetName", "homeCity", "homeState", "homeProvince", "homePostalCode", "homeCountry", "mailingSameAsHome", "mailAddress1", "mailApt", "mailStreetNum", "mailStreetName", "mailCity", "mailState", "mailProvince", "mailPostalCode", "mailCountry", "email", "phoneType", "phoneCountryCode", "phoneNumber"]],
        ["# Visit", ["travelPurpose", "travelFrom", "travelTo", "funds", "payerTrip", "travelCompanion", "canContactName", "canContactRelationship", "canContactAddress", "canContactPhone", "intendedProvince", "itinerary", "travelPurposeOther"]],
        ["# WorkAndEducation", ["job1_title", "job1_company", "job1_city", "job1_country", "job1_from", "job1_to", "job2_title", "job2_company", "job2_city", "job2_country", "job2_from", "job2_to", "job3_title", "job3_company", "job3_city", "job3_country", "job3_from", "job3_to", "job4_title", "job4_company", "job4_city", "job4_country", "job4_from", "job4_to", "hasEducation", "eduLevel", "eduSchool", "eduField", "eduCity", "eduProvince", "eduCountry", "eduFrom", "eduTo"]],
        ["# Background", ["bg1", "bg2", "bg3", "bg4", "bg5", "bg6", "bg7", "bg8", "bgExplanation"]]
    ];
    const out = [];
    groups.forEach(([title, keys]) => {
        out.push(title);
        keys.forEach((key) => d[key] && out.push(`${key}=${d[key]}`));
        out.push("");
    });
    return out.join("\n").trim() + "\n";
}

function addPdfSection(doc, state, title) {
    if (state.y > 268) { doc.addPage(); state.y = 18; }
    doc.setFillColor(15, 118, 110);
    doc.rect(15, state.y - 4, 180, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.text(title, 18, state.y + 1.5);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    state.y += 11;
}

function addPdfText(doc, state, text, bold = false, indent = 0) {
    doc.setFont("Helvetica", bold ? "bold" : "normal");
    doc.splitTextToSize(text || "Nao informado", 170 - indent).forEach((line) => {
        if (state.y > 275) { doc.addPage(); state.y = 18; }
        doc.text(line, 20 + indent, state.y);
        state.y += 6;
    });
    state.y += 1;
}

const line = (label, value) => `${label}: ${value || "Nao informado"}`;

function generatePdfBlob() {
    const d = mapped();
    const r = raw();
    const fullName = `${clean(r.firstName)} ${clean(r.lastName)}`.trim() || clean(r.declaracaoNome);
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const state = { y: 18 };

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Formulario de Visto Canadense", 20, state.y);
    state.y += 8;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Solicitante: ${fullName || "Nao informado"}`, 20, state.y);
    state.y += 10;

    addPdfSection(doc, state, "Dados pessoais");
    [line("UCI / Client ID", d.uci), line("Tipo de solicitacao", clean(r.applicationType)), line("Sobrenome", d.lastName), line("Nome", d.firstName), line("Outros nomes", d.alias === "Yes" ? `${d.aliasLastName} ${d.aliasFirstName}`.trim() : "Nao"), line("Sexo", clean(r.gender)), line("Data de nascimento", formatDateBr(d.dob)), line("Cidade de nascimento", d.birthCity), line("Pais de nascimento", clean(r.birthCountry)), line("Pais de cidadania", clean(r.citizenship)), line("Pais de residencia atual", clean(r.currentResidenceCountry)), line("Status no pais de residencia", clean(r.currentResidenceStatus)), line("Residencia desde", d.currentResidenceFrom)].forEach((item, idx) => addPdfText(doc, state, item, idx === 2));

    addPdfSection(doc, state, "Familia e idioma");
    [line("Lingua nativa", clean(r.nativeLang)), line("Comunicacao em ingles ou frances", clean(r.canCommunicate)), line("Estado civil", clean(r.maritalStatus)), line("Data da uniao ou casamento", formatDateBr(d.marriageDate)), line("Conjuge", `${clean(r.spouseFirstName)} ${clean(r.spouseLastName)}`.trim()), line("Nascimento do conjuge", formatDateBr(clean(r.spouseDob))), line("Residencias anteriores", d.hadPreviousResidence === "Yes" ? "Sim" : "Nao"), line("Pais anterior 1", `${clean(r.prevCountry1)} | ${clean(r.prevStatus1)} | ${clean(r.prevFrom1)} a ${clean(r.prevTo1)}`.trim()), line("Pais anterior 2", `${clean(r.prevCountry2)} | ${clean(r.prevStatus2)} | ${clean(r.prevFrom2)} a ${clean(r.prevTo2)}`.trim()), line("Relacionamento anterior", d.hadPreviousMarriage === "Yes" ? "Sim" : "Nao"), line("Ex-conjuge", clean(r.previousSpouseName)), line("Tipo de relacao anterior", clean(r.previousMarriageType)), line("Periodo anterior", `${formatDateBr(clean(r.previousMarriageFrom))} a ${formatDateBr(clean(r.previousMarriageTo))}`)].forEach((item) => addPdfText(doc, state, item));

    addPdfSection(doc, state, "Passaporte, identidade e contato");
    [line("Numero do passaporte", d.passportNum), line("Pais de emissao", clean(r.passportCountry)), line("Emissao", formatDateBr(d.issueDate)), line("Validade", formatDateBr(d.expiryDate)), line("Documento nacional", d.nationalIdHas === "Yes" ? clean(r.nationalIdNumber) : "Nao"), line("Visto americano valido", d.usVisa === "Yes" ? "Sim" : "Nao"), line("Visto canadense anterior", d.canVisa === "Yes" ? "Sim" : "Nao"), line("Residencia permanente nos EUA", d.usPermanentResident === "Yes" ? clean(r.usPrNumber) : "Nao"), line("Endereco residencial", d.homeAddress1), line("Cidade / Estado / CEP", `${d.homeCity} / ${d.homeState} / ${d.homePostalCode}`), line("Pais", clean(r.homeCountry)), line("E-mail", d.email), line("Telefone", `${clean(r.phoneCountryCode)} ${d.phoneNumber}`), line("Endereco de correspondencia igual", d.mailingSameAsHome === "Yes" ? "Sim" : "Nao"), line("Endereco de correspondencia", d.mailingSameAsHome === "Yes" ? d.homeAddress1 : d.mailAddress1), line("Cidade / Estado / CEP da correspondencia", d.mailingSameAsHome === "Yes" ? `${d.homeCity} / ${d.homeState} / ${d.homePostalCode}` : `${d.mailCity} / ${d.mailState} / ${d.mailPostalCode}`), line("Pais da correspondencia", d.mailingSameAsHome === "Yes" ? clean(r.homeCountry) : clean(r.mailCountry))].forEach((item) => addPdfText(doc, state, item));

    addPdfSection(doc, state, "Viagem ao Canada");
    [line("Proposito principal", clean(r.travelPurpose)), line("Chegada prevista", formatDateBr(d.travelFrom)), line("Saida prevista", formatDateBr(d.travelTo)), line("Fundos disponiveis (CAD)", d.funds), line("Quem paga a viagem", d.payerTrip), line("Acompanhantes", d.travelCompanion), line("Contato no Canada", d.canContactName), line("Relacao com o contato", d.canContactRelationship), line("Endereco do contato", d.canContactAddress), line("Telefone do contato", d.canContactPhone), line("Provincia / cidade principal", d.intendedProvince), line("Roteiro resumido", d.itinerary), line("Detalhes adicionais", d.travelPurposeOther)].forEach((item) => addPdfText(doc, state, item));

    addPdfSection(doc, state, "Trabalho e estudos");
    [line("Cargo atual", d.job1_title), line("Empresa atual", d.job1_company), line("Cidade / pais atual", d.job1_city), line("Inicio atual", d.job1_from), line("Historico 1", `${d.job2_title} | ${d.job2_company} | ${d.job2_city} | ${d.job2_from} a ${d.job2_to}`), line("Historico 2", `${d.job3_title} | ${d.job3_company} | ${d.job3_city} | ${d.job3_from} a ${d.job3_to}`), line("Historico 3", `${d.job4_title} | ${d.job4_company} | ${d.job4_city} | ${d.job4_from} a ${d.job4_to}`), line("Historico de estudos informado", d.hasEducation === "Yes" ? "Sim" : "Nao"), line("Nivel mais alto", d.eduLevel), line("Instituicao", d.eduSchool), line("Curso / area", d.eduField), line("Cidade", d.eduCity), line("Estado / provincia", d.eduProvince), line("Pais", d.eduCountry), line("Periodo de estudo", `${d.eduFrom} a ${d.eduTo}`)].forEach((item) => addPdfText(doc, state, item));

    addPdfSection(doc, state, "Seguranca e antecedentes");
    [line("Tuberculose ou contato proximo", clean(r.bg1)), line("Condicao medica ou mental relevante", clean(r.bg2)), line("Excedeu permanencia ou trabalhou sem permissao", clean(r.bg3)), line("Visto negado ou entrada recusada", clean(r.bg4)), line("Prisao, acusacao ou condenacao", clean(r.bg5)), line("Servico militar ou policial", clean(r.bg6)), line("Grupo associado a violencia", clean(r.bg7)), line("Abuso contra civis ou prisioneiros", clean(r.bg8)), line("Detalhes", d.bgExplanation)].forEach((item) => addPdfText(doc, state, item));

    addPdfSection(doc, state, "Declaracao");
    [line("Declarante", clean(r.declaracaoNome)), line("Local", clean(r.declaracaoLocal)), line("Data", formatDateBr(clean(r.declaracaoData))), line("Aceite da declaracao", r.aceiteDeclaracao ? "Sim" : "Nao")].forEach((item, idx) => addPdfText(doc, state, item, idx === 0));
    addPdfText(doc, state, `Eu, ${clean(r.declaracaoNome)}, declaro, sob as penas da lei, que li e compreendi integralmente todas as questoes contidas nesta solicitacao de visto e afirmo que as respostas por mim fornecidas sao verdadeiras, completas e corretas, conforme o meu melhor conhecimento e conviccao.`);
    addPdfText(doc, state, "Declaro estar ciente de que:");
    [
        "1. Qualquer declaracao falsa, incompleta ou enganosa podera resultar na recusa do visto ou em outras medidas cabiveis pelas autoridades competentes.",
        "2. Todas as informacoes prestadas nesta solicitacao sao de minha exclusiva responsabilidade e poderao ser verificadas pelas autoridades imigratorias competentes.",
        "3. Informacoes e documentos adicionais poderao ser requisitados apos a analise desta solicitacao, sendo minha responsabilidade apresenta-los tempestivamente.",
        "4. As informacoes contidas nesta solicitacao poderao ser compartilhadas com autoridades governamentais competentes para fins de verificacao, seguranca, imigracao e aplicacao da lei, nos limites da legislacao aplicavel.",
        "5. Fotografias, documentos e dados fornecidos poderao ser utilizados para verificacao de identidade e demais finalidades legais relacionadas ao processamento do pedido.",
        "6. Sou exclusivamente responsavel pela autenticidade e exatidao dos documentos apresentados e das informacoes prestadas.",
        "7. Tenho pleno conhecimento de que a concessao ou negativa do visto e prerrogativa exclusiva da Autoridade Consular e das autoridades imigratorias do Canada.",
        "8. Estou ciente de que entrevistas, biometria, exames ou documentos complementares poderao ser exigidos a criterio exclusivo das autoridades competentes.",
        "9. Reconheco que o servico contratado constitui assessoria relacionada ao preenchimento de documentacao, organizacao do processo e orientacao de tramites, nao abrangendo promessas de aprovacao do visto.",
        "10. A aposicao da minha assinatura eletronica neste documento possui validade juridica conforme a legislacao aplicavel e representa meu reconhecimento expresso dos servicos contratados."
    ].forEach((item) => addPdfText(doc, state, item, false, 4));
    addPdfText(doc, state, "Autorizacao:");
    addPdfText(doc, state, "Declaro, por fim, ter revisado e conferido todos os dados por mim apresentados, autorizando expressamente a empresa Objetivo Turismo Ltda., contratada diretamente por mim ou por intermedio de minha agencia, a proceder com o envio eletronico das informacoes necessarias ao formulario IMM 5257 e documentos correlatos, bem como a realizar os procedimentos operacionais necessarios a tramitacao do meu pedido perante as autoridades competentes.");
    return doc.output("blob");
}

async function handleSubmit(event) {
    event.preventDefault();
    if (!validateRequired()) return;
    submitBtn.classList.add("saving");
    submitBtn.disabled = true;
    clearBtn.disabled = true;
    clearStatus();
    try {
        const d = mapped();
        const txtBlob = new Blob([buildTxt()], { type: "text/plain;charset=utf-8" });
        const pdfBlob = generatePdfBlob();
        const timestamp = Date.now();
        const applicantSlug = `${slug(d.lastName)}_${slug(d.firstName)}`;
        const storageBase = `pdfs/imm5257_${applicantSlug}_${timestamp}`;
        const pdfRef = ref(storage, `${storageBase}.pdf`);
        const txtRef = ref(storage, `${storageBase}.txt`);
        await Promise.all([
            uploadBytes(pdfRef, pdfBlob, { contentType: "application/pdf" }),
            uploadBytes(txtRef, txtBlob, { contentType: "text/plain" })
        ]);
        const pdfUrl = await getDownloadURL(pdfRef);
        const fullName = `${clean(d.firstName)} ${clean(d.lastName)}`.trim();
        const waText = [
            "Novo formulario de visto canadense.",
            fullName ? `Cliente: ${fullName}` : "",
            `PDF: ${pdfUrl}`
        ].filter(Boolean).join("\n");
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`, "_blank", "noopener");
        setStatus("success", "Formulario enviado com sucesso. Seus dados foram registrados.");
        form.reset();
        document.querySelector('input[name="alias"][value="Nao"]').checked = true;
        document.querySelector('input[name="hadPreviousResidence"][value="Nao"]').checked = true;
        document.querySelector('input[name="hadPreviousMarriage"][value="Nao"]').checked = true;
        document.querySelector('input[name="nationalIdHas"][value="Nao"]').checked = true;
        document.querySelector('input[name="mailingSameAsHome"][value="Sim"]').checked = true;
        document.querySelector('input[name="hasEducation"][value="Nao"]').checked = true;
        toggleByRadio("alias", "aliasBox");
        toggleByRadio("hadPreviousResidence", "residenceBox");
        toggleByRadio("hadPreviousMarriage", "previousMarriageBox");
        toggleByRadio("nationalIdHas", "idBox");
        toggleByRadio("mailingSameAsHome", "mailBox", "Nao");
        toggleEducation();
        toggleSpouse();
        toggleBg();
    } catch (error) {
        console.error(error);
        setStatus("error", "Nao foi possivel concluir o envio neste momento. Tente novamente em instantes.");
    } finally {
        submitBtn.classList.remove("saving");
        submitBtn.disabled = false;
        clearBtn.disabled = false;
    }
}

clearBtn.addEventListener("click", () => {
    form.reset();
    clearStatus();
    document.querySelector('input[name="alias"][value="Nao"]').checked = true;
    document.querySelector('input[name="hadPreviousResidence"][value="Nao"]').checked = true;
    document.querySelector('input[name="hadPreviousMarriage"][value="Nao"]').checked = true;
    document.querySelector('input[name="nationalIdHas"][value="Nao"]').checked = true;
    document.querySelector('input[name="mailingSameAsHome"][value="Sim"]').checked = true;
    document.querySelector('input[name="hasEducation"][value="Nao"]').checked = true;
    toggleByRadio("alias", "aliasBox");
    toggleByRadio("hadPreviousResidence", "residenceBox");
    toggleByRadio("hadPreviousMarriage", "previousMarriageBox");
    toggleByRadio("nationalIdHas", "idBox");
    toggleByRadio("mailingSameAsHome", "mailBox", "Nao");
    toggleEducation();
    toggleSpouse();
    toggleBg();
});

form.addEventListener("submit", handleSubmit);
form.querySelectorAll('input[name="alias"]').forEach((el) => el.addEventListener("change", () => toggleByRadio("alias", "aliasBox")));
form.querySelectorAll('input[name="hadPreviousResidence"]').forEach((el) => el.addEventListener("change", () => toggleByRadio("hadPreviousResidence", "residenceBox")));
form.querySelectorAll('input[name="hadPreviousMarriage"]').forEach((el) => el.addEventListener("change", () => toggleByRadio("hadPreviousMarriage", "previousMarriageBox")));
form.querySelectorAll('input[name="nationalIdHas"]').forEach((el) => el.addEventListener("change", () => toggleByRadio("nationalIdHas", "idBox")));
form.querySelectorAll('input[name="mailingSameAsHome"]').forEach((el) => el.addEventListener("change", () => toggleByRadio("mailingSameAsHome", "mailBox", "Nao")));
form.querySelectorAll('input[name="hasEducation"]').forEach((el) => el.addEventListener("change", toggleEducation));
document.getElementById("maritalStatus").addEventListener("change", toggleSpouse);
document.querySelectorAll(".bg").forEach((el) => el.addEventListener("change", toggleBg));
form.querySelectorAll('input[name="firstName"], input[name="lastName"]').forEach((el) => el.addEventListener("input", () => {
    const decl = form.querySelector('input[name="declaracaoNome"]');
    if (!decl.dataset.locked) {
        decl.value = `${clean(form.querySelector('input[name="firstName"]').value)} ${clean(form.querySelector('input[name="lastName"]').value)}`.trim();
    }
}));
form.querySelector('input[name="declaracaoNome"]').addEventListener("input", (event) => {
    event.target.dataset.locked = clean(event.target.value) ? "1" : "";
});

toggleByRadio("alias", "aliasBox");
toggleByRadio("hadPreviousResidence", "residenceBox");
toggleByRadio("hadPreviousMarriage", "previousMarriageBox");
toggleByRadio("nationalIdHas", "idBox");
toggleByRadio("mailingSameAsHome", "mailBox", "Nao");
toggleEducation();
toggleSpouse();
toggleBg();
