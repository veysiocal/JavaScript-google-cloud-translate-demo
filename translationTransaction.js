const expressAsyncHandler = require("express-async-handler");
const Controller = require(".");
const db = require("../models");

const { Translate } = require("@google-cloud/translate").v2;

class translationTransactions extends Controller{
    constructor(model, modelName, id, fieldNames) {
        super(model);
        this.id = id;
        this.fieldNames = fieldNames;
        this.modelName = modelName;
      }
    getTranslate = expressAsyncHandler( () =>  {
        const CREDENTIALS = JSON.parse(process.env.CREDENTIALS);
        const translate = new Translate({
            credentials: CREDENTIALS,
            projectId: CREDENTIALS.project_id
        });
        return translate;
    })
    create = expressAsyncHandler(async (req, res) => {
            const translate = await this.getTranslate();

            const created = await this.model.create(req.body);
            const tableId = created[this.id];
            this.fieldNames.forEach(async (fieldName) => 
                {
                const description = created[fieldName];
                const translateId = tableId + "-" + this.modelName + "-" + fieldName;
                const translateCreated = await db.translates.create({
                    translateId,
                    description,
                });
                const languagesGet = await db.languages.findAll();
                languagesGet.forEach(async(element) => {
                const [translation] = await translate.translate(description, element.language);
                    await db.translations.create({
                        translateId: translateCreated.translateId,
                        language: element.language,
                        translation,
                    });
                });
            })  

            return res.status(200)
            .json({
                success: true,
                message: "Data created.",
                data: created,
            });
    })
    update = expressAsyncHandler(async (req, res) => {
            const translate = await this.getTranslate();

            const updated = await req.data.update(req.body);
            const tableId = updated[this.id];
            this.fieldNames.forEach(async (fieldName) => 
                {
                const description = updated[fieldName];
                const translateId = tableId + "-" + this.modelName + "-" + fieldName;
                const translateFind = await db.translates.findOne({
                    where: {
                        translateId,
                    }
                });
                await translateFind.update({
                    description,
                });
                const languagesGet = await db.languages.findAll();
                languagesGet.forEach(async(element) => {
                const [translation] = await translate.translate(description, element.language);
                const translationFind = await db.translations.findOne({
                    where: {
                        translateId,
                        language: element.language,
                    }
                });
                    await translationFind.update({
                        translation,
                    });
                });
            })  

            return res.status(200)
            .json({
                success: true,
                message: "Updating is successful.",
                data: updated,
            });
    })


}

module.exports = translationTransactions;
