# Form Components

Reusable form field components for consistent form handling across the application.

## Components

### FormField

A reusable wrapper component for form fields that integrates with TanStack Form and NextUI components. It handles validation, error messages, and common field props in a consistent way.

#### Features

- Supports `input`, `textarea`, and `select` field types
- Automatic error message display
- Required field indicator
- Consistent styling across all forms
- Type-safe with TypeScript

#### Basic Usage

```tsx
import { FormField } from "@/components/forms";
import { useForm } from "@tanstack/react-form";

function MyForm() {
  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      category: "",
    },
  });

  return (
    <form>
      {/* Text Input */}
      <FormField
        form={form}
        name="name"
        label="Name"
        inputType="input"
        required
        placeholder="Enter name"
      />

      {/* Textarea */}
      <FormField
        form={form}
        name="description"
        label="Description"
        inputType="textarea"
        placeholder="Enter description"
        inputProps={{
          rows: 4,
        }}
      />

      {/* Select */}
      <FormField
        form={form}
        name="category"
        label="Category"
        inputType="select"
        required
        placeholder="Select category"
        inputProps={{
          options: [
            { value: "option1", label: "Option 1" },
            { value: "option2", label: "Option 2" },
          ],
        }}
      />
    </form>
  );
}
```

#### Input Types

##### Text Input

```tsx
<FormField
  form={form}
  name="poolName"
  label="Pool Name"
  inputType="input"
  required
  placeholder="Enter pool name"
  validators={{
    onChange: ({ value }) => {
      if (!value) return "Pool name is required";
      return undefined;
    },
  }}
/>
```

##### Number Input with Content

```tsx
<FormField
  form={form}
  name="threshold"
  label="Threshold (US$)"
  inputType="input"
  required
  placeholder="Enter threshold amount"
  inputProps={{
    type: "number",
    startContent: (
      <div className="pointer-events-none flex items-center">
        <span className="text-default-400 text-small">$</span>
      </div>
    ),
  }}
  validators={{
    onChange: ({ value }) => {
      if (!value || Number(value) <= 0) {
        return "Threshold must be greater than 0";
      }
      return undefined;
    },
  }}
/>
```

##### Percentage Input

```tsx
<FormField
  form={form}
  name="expectedReturn"
  label="Expected Return (%)"
  inputType="input"
  required
  placeholder="Enter expected return"
  inputProps={{
    type: "number",
    endContent: (
      <div className="pointer-events-none flex items-center">
        <span className="text-default-400 text-small">%</span>
      </div>
    ),
  }}
/>
```

##### Textarea

```tsx
<FormField
  form={form}
  name="description"
  label="Description"
  inputType="textarea"
  placeholder="Enter description"
  description="Provide a detailed description"
  inputProps={{
    rows: 5,
    variant: "bordered",
  }}
/>
```

##### Select Dropdown

```tsx
<FormField
  form={form}
  name="assetClass"
  label="Asset Class"
  inputType="select"
  required
  placeholder="Select asset class"
  validators={{
    onBlur: ({ value }) => {
      if (!value) return "Asset class is required";
      return undefined;
    },
  }}
  inputProps={{
    options: [
      { value: "real-estate", label: "Real Estate" },
      { value: "auto-loans", label: "Auto Loans" },
      { value: "consumer-loans", label: "Consumer Loans" },
    ],
  }}
/>
```

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `form` | `FormApi` | Yes | TanStack Form instance |
| `name` | `string` | Yes | Field name |
| `label` | `string` | Yes | Field label |
| `inputType` | `'input' \| 'textarea' \| 'select'` | Yes | Type of input to render |
| `required` | `boolean` | No | Shows required indicator (*) |
| `placeholder` | `string` | No | Placeholder text |
| `description` | `string` | No | Helper text below label |
| `validators` | `object` | No | TanStack Form validators |
| `inputProps` | `object` | No | Type-specific props (see below) |
| `classNames` | `Record<string, string>` | No | NextUI classNames prop |

#### Input Props by Type

##### Input (`inputType="input"`)

```tsx
{
  type?: "text" | "number" | "email" | "date" | "datetime-local";
  startContent?: ReactNode;
  endContent?: ReactNode;
  variant?: "flat" | "bordered" | "faded" | "underlined";
  isDisabled?: boolean;
  isReadOnly?: boolean;
}
```

##### Textarea (`inputType="textarea"`)

```tsx
{
  rows?: number;
  variant?: "flat" | "bordered" | "faded" | "underlined";
  isDisabled?: boolean;
  isReadOnly?: boolean;
}
```

##### Select (`inputType="select"`)

```tsx
{
  options: Array<{
    value: string;
    label: string;
    startContent?: ReactNode;
  }>;
  variant?: "flat" | "bordered" | "faded" | "underlined";
  isDisabled?: boolean;
  isLoading?: boolean;
}
```

#### Validation Examples

##### With Zod Schema

```tsx
import { z } from "zod";

const schema = z.object({
  poolName: z.string().min(1, "Pool name is required"),
  threshold: z.string().refine((val) => Number(val) > 0, {
    message: "Threshold must be greater than 0",
  }),
});

<FormField
  form={form}
  name="poolName"
  label="Pool Name"
  inputType="input"
  required
  validators={{
    onChange: ({ value }) => {
      try {
        schema.shape.poolName.parse(value);
        return undefined;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return error.errors[0]?.message || "Invalid pool name";
        }
        return "Invalid pool name";
      }
    },
  }}
/>
```

##### Custom Validation

```tsx
<FormField
  form={form}
  name="email"
  label="Email"
  inputType="input"
  required
  inputProps={{
    type: "email",
  }}
  validators={{
    onChange: ({ value }) => {
      if (!value) return "Email is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return "Please enter a valid email";
      }
      return undefined;
    },
  }}
/>
```

#### When to Use FormField

Use FormField for:
- Standard text inputs
- Number inputs
- Textareas
- Simple select dropdowns

Don't use FormField for:
- Custom components with special logic (e.g., DateTimePicker, FileUpload)
- Select fields with custom rendering (e.g., with icons or images)
- Radio button groups
- Checkbox groups
- Fields with complex onChange logic that transforms values

#### Migration Example

Before:
```tsx
<form.Field
  name="poolName"
  validators={{
    onChange: ({ value }) => {
      if (!value) return "Pool name is required";
      return undefined;
    },
  }}
>
  {(field) => (
    <div className="space-y-1">
      <h3 className="text-sm font-medium text-default-500 after:content-['*'] after:ml-0.5 after:text-red-500">
        Pool Name
      </h3>
      <Input
        placeholder="Enter pool name"
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        errorMessage={field.state.meta.errors?.[0]}
        isInvalid={field.state.meta.errors?.length > 0}
        variant="bordered"
        isRequired
      />
    </div>
  )}
</form.Field>
```

After:
```tsx
<FormField
  form={form}
  name="poolName"
  label="Pool Name"
  inputType="input"
  required
  placeholder="Enter pool name"
  validators={{
    onChange: ({ value }) => {
      if (!value) return "Pool name is required";
      return undefined;
    },
  }}
/>
```

### DateTimePicker

A specialized date-time input component with proper formatting.

```tsx
import { DateTimePicker } from "@/components/forms";

<form.Field name="startTime">
  {(field) => (
    <DateTimePicker
      value={field.state.value}
      onChange={(date) => field.handleChange(date)}
      label="Start Time"
      min={new Date()}
    />
  )}
</form.Field>
```

## Best Practices

1. **Use barrel exports**: Import from `@/components/forms` instead of individual files
2. **Keep validators consistent**: Use the same validation pattern across similar fields
3. **Use required prop**: Always set `required` for required fields to show the asterisk
4. **Provide helpful placeholders**: Give users examples of expected input
5. **Add descriptions for complex fields**: Use the `description` prop to clarify requirements

## Examples in Codebase

- **PoolDetailsSection**: `/app/src/components/pool/create/sections/PoolDetailsSection.tsx`
  - Text inputs with currency symbols
  - Select dropdowns
  - File uploads (not using FormField)

- **GeneralInfoSection**: `/app/src/components/pool/create/sections/GeneralInfoSection.tsx`
  - Number inputs with percentage symbols
  - Date-time pickers (using specialized component)

- **ProductFormDialog**: `/app/src/components/pool-products/ProductFormDialog.tsx`
  - Mixed input types in a modal
  - Optional and required fields
