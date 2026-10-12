"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { adminAddProduct } from "@/lib/admin";
import { useToast } from "@/hooks/useToast";
import {
  fieldErrorsFromStack,
  serverFormError,
} from "@/lib/format";
import { productFormErrors } from "@/lib/validation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import CatalogTriplePicker from "@/components/admin/CatalogTriplePicker";
import MultiImagePicker from "@/components/admin/MultiImagePicker";
import ProductFields from "@/components/admin/ProductFields";
import { specsError, specsToObject } from "@/components/admin/SpecsEditor";

const TAG = "[admin/products/new]";
const MAX_IMAGES = 10;

const EMPTY_VALUES = {
  title: "",
  overview: "",
  price: "",
  discountAmount: "0",
  discountType: "PERCENTAGE",
  stock: "",
};

export default function AdminNewProductPage() {
  const toast = useToast();
  const router = useRouter();
  const [values, setValues] = useState(EMPTY_VALUES);
  const [specsRows, setSpecsRows] = useState([]);
  const [files, setFiles] = useState([]);
  const [triple, setTriple] = useState({ category: "", subCategory: "", brand: "" });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [pending, setPending] = useState(false);

  const onField = (key) => (e) => {
    const v = e.target.value;
    setValues((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setBanner("");
  };

  const submit = async (e) => {
    e.preventDefault();
    // Client gates (server re-validates): fields, specs, images, triple.
    const local = productFormErrors(values);
    const specsErr = specsError(specsRows);
    if (specsErr) local.specs = specsErr;
    if (files.length === 0) local.images = "Add at least one image.";
    else if (files.length > MAX_IMAGES) local.images = `At most ${MAX_IMAGES} images.`;
    if (!triple.category || !triple.subCategory || !triple.brand) {
      local.triple = "Pick a category, subcategory, and brand.";
    }
    if (Object.values(local).some(Boolean)) {
      setErrors(local);
      return;
    }
    setPending(true);
    setErrors({});
    setBanner("");
    try {
      // Multipart create: scalar fields as strings, specs as a JSON string
      // (controller JSON.parses it), one append per file so multer's
      // .array("images", 10) sees an array. Parents travel as query
      // (?category=&subCategory=&brand=) — validated as a triple server-side.
      const fd = new FormData();
      fd.append("title", values.title.trim());
      fd.append("overview", values.overview.trim());
      fd.append("specs", JSON.stringify(specsToObject(specsRows)));
      fd.append("price", String(Number(values.price)));
      fd.append("discountAmount", String(Number(values.discountAmount)));
      // Contract value (PERCENTAGE/FIXED per Joi). NOTE: the Mongoose enum
      // only accepts Percentage/Fixed, so creates 500 until the backend
      // aligns the two — see README Known open items. Do NOT send
      // title-case instead (Joi would 400 before it ever reaches Mongoose).
      fd.append("discountType", values.discountType);
      fd.append("stock", String(Number(values.stock)));
      for (const file of files) fd.append("images", file);
      const res = await apiFetch(adminAddProduct(), {
        method: "POST",
        auth: true,
        rawBody: true,
        params: {
          category: triple.category,
          subCategory: triple.subCategory,
          brand: triple.brand,
        },
        body: fd,
      });
      toast.success("Product created");
      const id = res?.data?._id;
      router.replace(id ? `/admin/products/${id}` : "/admin/products");
    } catch (err) {
      console.error(TAG, err);
      const fields = fieldErrorsFromStack(err?.data?.stack);
      const top = fields[""];
      delete fields[""];
      setErrors(fields);
      setBanner(top || serverFormError(err, "Could not create product. Try again."));
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/products"
            className="text-sm font-medium text-primary hover:underline"
          >
            ← Back to products
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-text">New product</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            href="/admin/products"
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={submit} loading={pending}>
            Create product
          </Button>
        </div>
      </div>

      <form onSubmit={submit} noValidate className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card padded className="lg:col-span-2">
          <ProductFields
            values={values}
            onField={onField}
            specsRows={specsRows}
            onSpecsChange={(rows) => {
              setSpecsRows(rows);
              setErrors((prev) => ({ ...prev, specs: undefined }));
              setBanner("");
            }}
            errors={errors}
            disabled={pending}
          />
          <div className="mt-3">
            <MultiImagePicker
              files={files}
              onChange={(next) => {
                setFiles(next);
                setErrors((prev) => ({ ...prev, images: undefined }));
                setBanner("");
              }}
              label="Images"
              required
              maxFiles={MAX_IMAGES}
              error={errors.images || ""}
              disabled={pending}
            />
          </div>
        </Card>
        <div className="space-y-3">
          <Card padded>
            <CatalogTriplePicker
              value={triple}
              onChange={(next) => {
                setTriple(next);
                setErrors((prev) => ({ ...prev, triple: undefined }));
                setBanner("");
              }}
              disabled={pending}
            />
            {errors.triple && (
              <p role="alert" className="mt-2 text-sm text-danger">
                {errors.triple}
              </p>
            )}
          </Card>
          {banner && (
            <p role="alert" className="text-sm text-danger">
              {banner}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
