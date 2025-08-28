import mongoose, { Schema, Document, Types } from "mongoose";

export interface IYourModel extends Document {
  // your fields here
}

const YourModelSchema: Schema<IYourModel> = new Schema(
  {
    // your schema here
  },
  { timestamps: true }
);

const YourModel = mongoose.model<IYourModel>("YourModel", YourModelSchema);

export default YourModel;