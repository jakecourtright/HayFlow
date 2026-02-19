---
description: How to style form fields (inputs, selects, textareas, labels) in this app
---

# Form Field Styling

**ALWAYS** use the themed CSS classes for all form elements. Never use bare/unstyled elements or generic class names like `input-field`.

## Classes

| Element      | Class           | Notes                                              |
|-------------|-----------------|----------------------------------------------------|
| `<input>`   | `input-modern`  | Text, number, date — all input types               |
| `<textarea>`| `input-modern`  | Same class as inputs                               |
| `<select>`  | `select-modern` | Native select with themed dropdown arrow           |
| `<label>`   | `label-modern`  | Uppercase, small, bold, dim color                  |
| Dropdowns   | `<CustomSelect>`| Use the `CustomSelect` component from `@/components/CustomSelect` when you need a richer dropdown (searchable, multi-select, etc.) |

## Example

```tsx
<div>
    <label className="label-modern">Customer</label>
    <input
        type="text"
        name="customer"
        placeholder="Customer name"
        className="input-modern"
    />
</div>

<div>
    <label className="label-modern">Price Per</label>
    <select name="priceUnit" className="select-modern">
        <option value="ton">$ / Ton</option>
        <option value="bale">$ / Bale</option>
    </select>
</div>
```

## Key Rules

1. **Never** use `className="input-field"` — that class doesn't exist in the design system.
2. **Never** inline label styles. Always use `label-modern`.
3. **All** form fields must follow this pattern — no exceptions for "quick" or "temporary" forms.
4. The CSS definitions live in `src/app/globals.css` under the "Modern Select Dropdowns", "Modern Input Fields", and "Label styling" sections.
