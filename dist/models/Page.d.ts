import mongoose, { type InferSchemaType, type HydratedDocument, type Model } from "mongoose";
declare const pageSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any, any>, {}, {}, {}, {}, {
    versionKey: false;
    timestamps: true;
    strict: true;
    autoIndex: false;
}, {
    pageKind: "symptom" | "disease" | "medicine" | "condition" | "treatment" | "procedure" | "test" | "wellness" | "faq" | "other";
    overview: string;
    titleTag: string;
    metaDescription: string;
    h1Heading: string;
    url: string;
    sections: mongoose.Types.DocumentArray<{
        id: string;
        heading: string;
        headingType: "h2" | "h3";
        body: string;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, unknown, {
        id: string;
        heading: string;
        headingType: "h2" | "h3";
        body: string;
    }, {}, {}> & {
        id: string;
        heading: string;
        headingType: "h2" | "h3";
        body: string;
    }>;
    content: string;
    quickAnswer: string;
    metaTag: string;
    status: string;
    author: string;
    headingStructure: {
        h2: string[];
        h3: string[];
        h1: string;
    };
    keywordPlacement: string[];
    altText: string[];
    imageAltText: string[];
    internalLinks: string[];
    views: number;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, {
    pageKind: "symptom" | "disease" | "medicine" | "condition" | "treatment" | "procedure" | "test" | "wellness" | "faq" | "other";
    overview: string;
    titleTag: string;
    metaDescription: string;
    h1Heading: string;
    url: string;
    sections: mongoose.Types.DocumentArray<{
        id: string;
        heading: string;
        headingType: "h2" | "h3";
        body: string;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, unknown, {
        id: string;
        heading: string;
        headingType: "h2" | "h3";
        body: string;
    }, {}, {}> & {
        id: string;
        heading: string;
        headingType: "h2" | "h3";
        body: string;
    }>;
    content: string;
    quickAnswer: string;
    metaTag: string;
    status: string;
    author: string;
    headingStructure: {
        h2: string[];
        h3: string[];
        h1: string;
    };
    keywordPlacement: string[];
    altText: string[];
    imageAltText: string[];
    internalLinks: string[];
    views: number;
} & mongoose.DefaultTimestampProps, {
    id: string;
}, mongoose.MergeType<mongoose.DefaultSchemaOptions, {
    versionKey: false;
    timestamps: true;
    strict: true;
    autoIndex: false;
}>> & Omit<{
    pageKind: "symptom" | "disease" | "medicine" | "condition" | "treatment" | "procedure" | "test" | "wellness" | "faq" | "other";
    overview: string;
    titleTag: string;
    metaDescription: string;
    h1Heading: string;
    url: string;
    sections: mongoose.Types.DocumentArray<{
        id: string;
        heading: string;
        headingType: "h2" | "h3";
        body: string;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, unknown, {
        id: string;
        heading: string;
        headingType: "h2" | "h3";
        body: string;
    }, {}, {}> & {
        id: string;
        heading: string;
        headingType: "h2" | "h3";
        body: string;
    }>;
    content: string;
    quickAnswer: string;
    metaTag: string;
    status: string;
    author: string;
    headingStructure: {
        h2: string[];
        h3: string[];
        h1: string;
    };
    keywordPlacement: string[];
    altText: string[];
    imageAltText: string[];
    internalLinks: string[];
    views: number;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
}, "id"> & {
    id: string;
}, unknown, {
    pageKind: "symptom" | "disease" | "medicine" | "condition" | "treatment" | "procedure" | "test" | "wellness" | "faq" | "other";
    overview: string;
    titleTag: string;
    metaDescription: string;
    h1Heading: string;
    url: string;
    sections: mongoose.Types.DocumentArray<{
        id: string;
        heading: string;
        headingType: "h2" | "h3";
        body: string;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, unknown, {
        id: string;
        heading: string;
        headingType: "h2" | "h3";
        body: string;
    }, {}, {}> & {
        id: string;
        heading: string;
        headingType: "h2" | "h3";
        body: string;
    }>;
    content: string;
    quickAnswer: string;
    metaTag: string;
    status: string;
    author: string;
    headingStructure: {
        h2: string[];
        h3: string[];
        h1: string;
    };
    keywordPlacement: string[];
    altText: string[];
    imageAltText: string[];
    internalLinks: string[];
    views: number;
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
type PageSchemaType = InferSchemaType<typeof pageSchema>;
export type PageDocument = HydratedDocument<PageSchemaType>;
type PageModelType = Model<PageSchemaType>;
declare const Page: PageModelType;
export default Page;
