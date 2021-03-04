const jsonfile = require('jsonfile');
const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const ejs = require('ejs');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', './views');

const ativos = [{
    sigla: "hctr11",
    // nome: "",
    // valorAtual: 0,
    // dy12: 0,
    // rmm: 0,
    // rmmByValorAtual: 0,
    // valorPatrimonialByCota: 0,
    // percentValorAtual: 0,
    // segmento: ""
},
{ sigla: "bbfi11b" },
{ sigla: "recr11" },
{ sigla: "hfof11" },
{ sigla: "mxrf11" },
{ sigla: "cpts11" },
{ sigla: "tgar11" },
{ sigla: "irdm11" },
{ sigla: "cvbi11" },
{ sigla: "knip11" },
{ sigla: "xpml11" },
{ sigla: "hglg11" },
{ sigla: "urpr11" },
{ sigla: "mfai11" },
{ sigla: "rect11" },
{ sigla: "deva11" },
{ sigla: "bari11" }
];

const asyncOperation = (value, index) => {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axios.get(`https://statusinvest.com.br/fundos-imobiliarios/${value.sigla}`);

            if (response) {
                const $ = cheerio.load(response.data);

                const nomeAtivo = $('.container .flex-nowrap div .lh-4', '#main-header').text();
                // const valor = $('.value', '#main-2')[0].children[0].data;
                const valor = $('.container .top-info .special div div .value', '#main-2').text();

                const dy12 = $('.container .top-info .info div div .value', '#main-2').eq(3).text();

                const valorPatrimonial = $('.container .mb-5 .top-info .info div div .value', '#main-2').eq(0).text();

                const pSobreVp = $('.container .mb-5 .top-info .info div div .value', '#main-2').eq(1).text();

                const rmm = $('.container .mb-5 .card .top-info .info div div .value', '#main-2').eq(0).text();

                const segmento = $('.container .company .card .top-info .info div div div a .value', '#fund-section').eq(0).text();

                value.valorAtual = Number(valor.replace(".", "").replace(",", "."));
                value.nome = nomeAtivo;
                value.dy12 = Number(dy12.replace(".", "").replace(",", "."));
                value.valorPatrimonial = Number(valorPatrimonial.replace(".", "").replace(",", "."));
                value.pSobreVp = Number(pSobreVp.replace(".", "").replace(",", "."));
                value.rmm = Number(rmm.replace(".", "").replace(",", "."));
                value.rmmByValorAtual = value.rmm / value.valorAtual;
                value.percentValorAtual = 100 * (value.valorAtual - value.valorPatrimonial) / value.valorAtual;
                value.segmento = segmento;

                // console.log(segmento);
                resolve(value);
            }
        } catch (err) {
            console.log(err);
            reject(err);
        }
    });
};

async function getDados() {
    // Running Promises in parallel
    const listOfPromises = ativos.map(asyncOperation);
    // Harvesting
    const results = [];
    for (const promise of listOfPromises) {
        const index = await promise;
        results.push(index);
    }
    return results;
}

async function updateDb() {
    return new Promise(async (resolve, reject) => {
        try {
            const result = await getDados();
            await saveInJSON({ expires: Date.now() + 10 * 60 * 1000, ativos: result });
            resolve();
        } catch (e) {
            reject();
        }
    })
}

function saveInJSON(data) {
    return new Promise((resolve, reject) => {
        let file = 'db.json';

        try {
            jsonfile.writeFile(file, data, (err) => {
                if (err) {
                    console.error(err);
                    reject();
                }
                resolve();
            })
        } catch (error) {
            console.log(error);
            reject();
        }
    })
}

function readInJSON() {
    return new Promise((resolve, reject) => {
        let file = 'db.json';

        try {
            jsonfile.readFile(file, function (err, obj) {
                if (err) {
                    console.error(err);
                    reject();
                }
                resolve(obj);
            })
        } catch (error) {
            console.log(error);
            reject();
        }
    })
}

app.get('/', async (req, res) => {
    let result = await readInJSON();

    if (result.expires < Date.now()) {
        await updateDb();
        result = await readInJSON();
    }

    res.render('index', { ativos: result.ativos });
})

app.listen(port, () => {
    console.log(`Server listening at port ${port}`);
})
