import manifest from "../../data/article_images.json";
import type { GroceryProduct } from "./data";

export function verifiedImageFor(product: GroceryProduct) {
  return manifest.images.find(image => image.article_id === product.articleId
    && image.unit === product.package?.unit
    && image.count === product.package.count
    && Number(image.amount) === Number(product.package.amount));
}
