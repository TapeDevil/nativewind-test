import type {
  AlignContent,
  AlignItems,
  AlignSelf,
  Angle,
  BorderSideWidth,
  BorderStyle,
  CssColor,
  Declaration,
  DimensionPercentageFor_LengthValue,
  Display,
  FontFamily,
  FontSize,
  FontStyle,
  FontVariantCaps,
  FontWeight,
  GapValue,
  JustifyContent,
  Length,
  LengthPercentageOrAuto,
  LengthValue,
  LineHeight,
  LineStyle,
  MaxSize,
  NumberOrPercentage,
  OverflowKeyword,
  PropertyId,
  Size,
  TextAlign,
  TextDecorationLine,
  TextDecorationStyle,
  TextShadow,
  TokenOrValue,
  VerticalAlign,
  Token,
  BoxShadow,
} from "lightningcss";

import type { ExtractionWarning, RuntimeValue } from "../types";

type AddStyleProp = (
  property: string,
  value: unknown,
  options?: {
    shortHand?: boolean;
    append?: boolean;
  },
) => void;

type HandleStyleShorthand = (
  property: string,
  options: Record<string, unknown>,
) => void;

type AddAnimationDefaultProp = (property: string, value: unknown[]) => void;
type AddContainerProp = (
  declaration: Extract<
    Declaration,
    { property: "container" | "container-name" | "container-type" }
  >,
) => void;
type AddTransitionProp = (
  declaration: Extract<
    Declaration,
    {
      property:
        | "transition-property"
        | "transition-duration"
        | "transition-delay"
        | "transition-timing-function"
        | "transition";
    }
  >,
) => void;
type AddWarning = (warning: ExtractionWarning) => undefined;

export interface ParseDeclarationOptions {
  inlineRem?: number | false;
  addStyleProp: AddStyleProp;
  handleStyleShorthand: HandleStyleShorthand;
  addAnimationProp: AddAnimationDefaultProp;
  addContainerProp: AddContainerProp;
  addTransitionProp: AddTransitionProp;
  addWarning: AddWarning;
  requiresLayout: (name: string) => void;
}

export interface ParseDeclarationOptionsWithValueWarning
  extends ParseDeclarationOptions {
  addValueWarning: (value: any) => undefined;
  addFunctionValueWarning: (value: any) => undefined;
}

export function parseDeclaration(
  declaration: Declaration,
  options: ParseDeclarationOptions,
) {
  const {
    addStyleProp,
    handleStyleShorthand,
    addAnimationProp,
    addContainerProp,
    addTransitionProp,
    addWarning,
  } = options;

  if (declaration.property === "unparsed") {
    if (!isValid(declaration.value.propertyId)) {
      return addWarning({
        type: "IncompatibleNativeProperty",
        property: declaration.value.propertyId.property,
      });
    }

    const parseOptions = {
      ...options,
      addFunctionValueWarning(value: any) {
        return addWarning({
          type: "IncompatibleNativeFunctionValue",
          property: declaration.value.propertyId.property,
          value,
        });
      },
      addValueWarning(value: any) {
        return addWarning({
          type: "IncompatibleNativeValue",
          property: declaration.value.propertyId.property,
          value,
        });
      },
    };

    return addStyleProp(
      declaration.value.propertyId.property,
      parseUnparsed(declaration.value.value, parseOptions),
    );
  } else if (declaration.property === "custom") {
    const property = declaration.value.name;
    if (
      validPropertiesLoose.has(property) ||
      property.startsWith("--") ||
      property.startsWith("-rn-")
    ) {
      return addStyleProp(
        property,
        parseUnparsed(declaration.value.value, {
          ...options,
          addValueWarning(value: any) {
            return addWarning({
              type: "IncompatibleNativeValue",
              property,
              value,
            });
          },
          addFunctionValueWarning(value: any) {
            return addWarning({
              type: "IncompatibleNativeFunctionValue",
              property,
              value,
            });
          },
        }),
      );
    } else {
      return addWarning({
        type: "IncompatibleNativeProperty",
        property: declaration.value.name,
      });
    }
  }

  const parseOptions = {
    ...options,
    addValueWarning(value: any) {
      return addWarning({
        type: "IncompatibleNativeValue",
        property: declaration.property,
        value,
      });
    },
    addFunctionValueWarning(value: any) {
      return addWarning({
        type: "IncompatibleNativeFunctionValue",
        property: declaration.property,
        value,
      });
    },
  };

  const addInvalidProperty = () => {
    return addWarning({
      type: "IncompatibleNativeProperty",
      property: declaration.property,
    });
  };

  if (!isValid(declaration)) {
    return addInvalidProperty();
  }

  switch (declaration.property) {
    case "background-color":
      return addStyleProp(
        declaration.property,
        parseColor(declaration.value, parseOptions),
      );
    case "opacity":
      return addStyleProp(declaration.property, declaration.value);
    case "color":
      return addStyleProp(
        declaration.property,
        parseColor(declaration.value, parseOptions),
      );
    case "display":
      return addStyleProp(
        declaration.property,
        parseDisplay(declaration.value, parseOptions),
      );
    case "width":
      return addStyleProp(
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "height":
      return addStyleProp(
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "min-width":
      return addStyleProp(
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "min-height":
      return addStyleProp(
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "max-width":
      return addStyleProp(
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "max-height":
      return addStyleProp(
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "block-size":
      return addStyleProp("width", parseSize(declaration.value, parseOptions));
    case "inline-size":
      return addStyleProp("height", parseSize(declaration.value, parseOptions));
    case "min-block-size":
      return addStyleProp(
        "min-width",
        parseSize(declaration.value, parseOptions),
      );
    case "min-inline-size":
      return addStyleProp(
        "min-height",
        parseSize(declaration.value, parseOptions),
      );
    case "max-block-size":
      return addStyleProp(
        "max-width",
        parseSize(declaration.value, parseOptions),
      );
    case "max-inline-size":
      return addStyleProp(
        "max-height",
        parseSize(declaration.value, parseOptions),
      );
    case "overflow":
      return addStyleProp(
        declaration.property,
        parseOverflow(declaration.value.x, parseOptions),
      );
    case "position":
      const value: any = (declaration as any).value.type;
      if (value === "absolute" || value === "relative") {
        return addStyleProp(declaration.property, value);
      } else {
        parseOptions.addValueWarning(value);
      }
      return;
    case "top":
      return addStyleProp(
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "bottom":
      return addStyleProp(
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "left":
      return addStyleProp(
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "right":
      return addStyleProp(
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "inset-block-start":
      return addStyleProp(
        declaration.property,
        parseLengthPercentageOrAuto(declaration.value, parseOptions),
      );
    case "inset-block-end":
      return addStyleProp(
        declaration.property,
        parseLengthPercentageOrAuto(declaration.value, parseOptions),
      );
    case "inset-inline-start":
      return addStyleProp(
        declaration.property,
        parseLengthPercentageOrAuto(declaration.value, parseOptions),
      );
    case "inset-inline-end":
      return addStyleProp(
        declaration.property,
        parseLengthPercentageOrAuto(declaration.value, parseOptions),
      );
    case "inset-block":
      return handleStyleShorthand("inset-block", {
        "inset-block-start": parseLengthPercentageOrAuto(
          declaration.value.blockStart,
          parseOptions,
        ),
        "inset-block-end": parseLengthPercentageOrAuto(
          declaration.value.blockEnd,
          parseOptions,
        ),
      });
    case "inset-inline":
      return handleStyleShorthand("inset-inline", {
        "inset-block-start": parseLengthPercentageOrAuto(
          declaration.value.inlineStart,
          parseOptions,
        ),
        "inset-block-end": parseLengthPercentageOrAuto(
          declaration.value.inlineEnd,
          parseOptions,
        ),
      });
    case "inset":
      handleStyleShorthand("inset", {
        top: parseLengthPercentageOrAuto(declaration.value.top, {
          ...parseOptions,
          addValueWarning(value: any) {
            addWarning({
              type: "IncompatibleNativeValue",
              property: "top",
              value,
            });
          },
          addFunctionValueWarning(value: any) {
            addWarning({
              type: "IncompatibleNativeFunctionValue",
              property: "top",
              value,
            });
          },
        }),
        bottom: parseLengthPercentageOrAuto(declaration.value.bottom, {
          ...parseOptions,
          addValueWarning(value: any) {
            addWarning({
              type: "IncompatibleNativeValue",
              property: "bottom",
              value,
            });
          },
          addFunctionValueWarning(value: any) {
            addWarning({
              type: "IncompatibleNativeFunctionValue",
              property: "bottom",
              value,
            });
          },
        }),
        left: parseLengthPercentageOrAuto(declaration.value.left, {
          ...parseOptions,
          addValueWarning(value: any) {
            addWarning({
              type: "IncompatibleNativeValue",
              property: "left",
              value,
            });
          },
          addFunctionValueWarning(value: any) {
            addWarning({
              type: "IncompatibleNativeFunctionValue",
              property: "left",
              value,
            });
          },
        }),
        right: parseLengthPercentageOrAuto(declaration.value.right, {
          ...parseOptions,
          addValueWarning(value: any) {
            addWarning({
              type: "IncompatibleNativeValue",
              property: "right",
              value,
            });
          },
          addFunctionValueWarning(value: any) {
            addWarning({
              type: "IncompatibleNativeFunctionValue",
              property: "right",
              value,
            });
          },
        }),
      });
      return;
    case "border-top-color":
      return addStyleProp(
        declaration.property,
        parseColor(declaration.value, parseOptions),
      );
    case "border-bottom-color":
      return addStyleProp(
        declaration.property,
        parseColor(declaration.value, parseOptions),
      );
    case "border-left-color":
      return addStyleProp(
        declaration.property,
        parseColor(declaration.value, parseOptions),
      );
    case "border-right-color":
      return addStyleProp(
        declaration.property,
        parseColor(declaration.value, parseOptions),
      );
    case "border-block-start-color":
      return addStyleProp(
        "border-top-color",
        parseColor(declaration.value, parseOptions),
      );
    case "border-block-end-color":
      return addStyleProp(
        "border-bottom-color",
        parseColor(declaration.value, parseOptions),
      );
    case "border-inline-start-color":
      return addStyleProp(
        "border-left-color",
        parseColor(declaration.value, parseOptions),
      );
    case "border-inline-end-color":
      return addStyleProp(
        "border-right-color",
        parseColor(declaration.value, parseOptions),
      );
    case "border-top-width":
      return addStyleProp(
        declaration.property,
        parseBorderSideWidth(declaration.value, parseOptions),
      );
    case "border-bottom-width":
      return addStyleProp(
        declaration.property,
        parseBorderSideWidth(declaration.value, parseOptions),
      );
    case "border-left-width":
      return addStyleProp(
        declaration.property,
        parseBorderSideWidth(declaration.value, parseOptions),
      );
    case "border-right-width":
      return addStyleProp(
        declaration.property,
        parseBorderSideWidth(declaration.value, parseOptions),
      );
    case "border-block-start-width":
      return addStyleProp(
        "border-top-width",
        parseBorderSideWidth(declaration.value, parseOptions),
      );
    case "border-block-end-width":
      return addStyleProp(
        "border-bottom-width",
        parseBorderSideWidth(declaration.value, parseOptions),
      );
    case "border-inline-start-width":
      return addStyleProp(
        "border-left-width",
        parseBorderSideWidth(declaration.value, parseOptions),
      );
    case "border-inline-end-width":
      return addStyleProp(
        "border-right-width",
        parseBorderSideWidth(declaration.value, parseOptions),
      );
    case "border-top-left-radius":
      return addStyleProp(
        declaration.property,
        parseLength(declaration.value[0], parseOptions),
      );
    case "border-top-right-radius":
      return addStyleProp(
        declaration.property,
        parseLength(declaration.value[0], parseOptions),
      );
    case "border-bottom-left-radius":
      return addStyleProp(
        declaration.property,
        parseLength(declaration.value[0], parseOptions),
      );
    case "border-bottom-right-radius":
      return addStyleProp(
        declaration.property,
        parseLength(declaration.value[0], parseOptions),
      );
    case "border-start-start-radius":
      return addStyleProp(
        declaration.property,
        parseLength(declaration.value[0], parseOptions),
      );
    case "border-start-end-radius":
      return addStyleProp(
        declaration.property,
        parseLength(declaration.value[0], parseOptions),
      );
    case "border-end-start-radius":
      return addStyleProp(
        declaration.property,
        parseLength(declaration.value[0], parseOptions),
      );
    case "border-end-end-radius":
      return addStyleProp(
        declaration.property,
        parseLength(declaration.value[0], parseOptions),
      );
    case "border-radius":
      handleStyleShorthand("border-radius", {
        "border-bottom-left-radius": parseLength(
          declaration.value.bottomLeft[0],
          parseOptions,
        ),
        "border-bottom-right-radius": parseLength(
          declaration.value.bottomRight[0],
          parseOptions,
        ),
        "border-top-left-radius": parseLength(
          declaration.value.topLeft[0],
          parseOptions,
        ),
        "border-top-right-radius": parseLength(
          declaration.value.topRight[0],
          parseOptions,
        ),
      });
      return;
    case "border-color":
      handleStyleShorthand("border-color", {
        "border-top-color": parseColor(declaration.value.top, {
          ...parseOptions,
          addValueWarning(value: any) {
            addWarning({
              type: "IncompatibleNativeValue",
              property: "border-top-color",
              value,
            });
          },
          addFunctionValueWarning(value: any) {
            addWarning({
              type: "IncompatibleNativeFunctionValue",
              property: "border-top-color",
              value,
            });
          },
        }),
        "border-bottom-color": parseColor(declaration.value.bottom, {
          ...parseOptions,
          addValueWarning(value: any) {
            addWarning({
              type: "IncompatibleNativeValue",
              property: "border-bottom-color",
              value,
            });
          },
          addFunctionValueWarning(value: any) {
            addWarning({
              type: "IncompatibleNativeFunctionValue",
              property: "border-bottom-color",
              value,
            });
          },
        }),
        "border-left-color": parseColor(declaration.value.left, {
          ...parseOptions,
          addValueWarning(value: any) {
            addWarning({
              type: "IncompatibleNativeValue",
              property: "border-left-color",
              value,
            });
          },
          addFunctionValueWarning(value: any) {
            addWarning({
              type: "IncompatibleNativeFunctionValue",
              property: "border-left-color",
              value,
            });
          },
        }),
        "border-right-color": parseColor(declaration.value.right, {
          ...parseOptions,
          addValueWarning(value: any) {
            addWarning({
              type: "IncompatibleNativeValue",
              property: "border-right-color",
              value,
            });
          },
          addFunctionValueWarning(value: any) {
            addWarning({
              type: "IncompatibleNativeFunctionValue",
              property: "border-right-color",
              value,
            });
          },
        }),
      });
      return;
    case "border-style":
      return addStyleProp(
        declaration.property,
        parseBorderStyle(declaration.value, parseOptions),
      );
    case "border-width":
      handleStyleShorthand("border-width", {
        "border-top-width": parseBorderSideWidth(
          declaration.value.top,
          parseOptions,
        ),
        "border-bottom-width": parseBorderSideWidth(
          declaration.value.bottom,
          parseOptions,
        ),
        "border-left-width": parseBorderSideWidth(
          declaration.value.left,
          parseOptions,
        ),
        "border-right-width": parseBorderSideWidth(
          declaration.value.right,
          parseOptions,
        ),
      });
      return;
    case "border-block-color":
      addStyleProp(
        "border-top-color",
        parseColor(declaration.value.start, parseOptions),
      );
      addStyleProp(
        "border-bottom-color",
        parseColor(declaration.value.end, parseOptions),
      );
      return;
    case "border-block-width":
      addStyleProp(
        "border-top-width",
        parseBorderSideWidth(declaration.value.start, parseOptions),
      );
      addStyleProp(
        "border-bottom-width",
        parseBorderSideWidth(declaration.value.end, parseOptions),
      );
      return;
    case "border-inline-color":
      addStyleProp(
        "border-left-color",
        parseColor(declaration.value.start, parseOptions),
      );
      addStyleProp(
        "border-right-color",
        parseColor(declaration.value.end, parseOptions),
      );
      return;
    case "border-inline-width":
      addStyleProp(
        "border-left-width",
        parseBorderSideWidth(declaration.value.start, parseOptions),
      );
      addStyleProp(
        "border-right-width",
        parseBorderSideWidth(declaration.value.end, parseOptions),
      );
      return;
    case "border":
      handleStyleShorthand("border", {
        "border-width": parseBorderSideWidth(
          declaration.value.width,
          parseOptions,
        ),
        "border-style": parseBorderStyle(declaration.value.style, parseOptions),
      });
      return;
    case "border-top":
      addStyleProp(
        declaration.property + "-color",
        parseColor(declaration.value.color, parseOptions),
      );
      addStyleProp(
        declaration.property + "-width",
        parseBorderSideWidth(declaration.value.width, parseOptions),
      );
      return;
    case "border-bottom":
      addStyleProp(
        declaration.property + "-color",
        parseColor(declaration.value.color, parseOptions),
      );
      addStyleProp(
        declaration.property + "-width",
        parseBorderSideWidth(declaration.value.width, parseOptions),
      );
      return;
    case "border-left":
      addStyleProp(
        declaration.property + "-color",
        parseColor(declaration.value.color, parseOptions),
      );
      addStyleProp(
        declaration.property + "-width",
        parseBorderSideWidth(declaration.value.width, parseOptions),
      );
      return;
    case "border-right":
      addStyleProp(
        declaration.property + "-color",
        parseColor(declaration.value.color, parseOptions),
      );
      addStyleProp(
        declaration.property + "-width",
        parseBorderSideWidth(declaration.value.width, parseOptions),
      );
      return;
    case "border-block":
      addStyleProp(
        "border-top-color",
        parseColor(declaration.value.color, parseOptions),
      );
      addStyleProp(
        "border-bottom-color",
        parseColor(declaration.value.color, parseOptions),
      );
      addStyleProp(
        "border-top-width",
        parseBorderSideWidth(declaration.value.width, parseOptions),
      );
      addStyleProp(
        "border-bottom-width",
        parseBorderSideWidth(declaration.value.width, parseOptions),
      );
      return;
    case "border-block-start":
      addStyleProp(
        "border-top-color",
        parseColor(declaration.value.color, parseOptions),
      );
      addStyleProp(
        "border-top-width",
        parseBorderSideWidth(declaration.value.width, parseOptions),
      );
      return;
    case "border-block-end":
      addStyleProp(
        "border-bottom-color",
        parseColor(declaration.value.color, parseOptions),
      );
      addStyleProp(
        "border-bottom-width",
        parseBorderSideWidth(declaration.value.width, parseOptions),
      );
      return;
    case "border-inline":
      addStyleProp(
        "border-left-color",
        parseColor(declaration.value.color, parseOptions),
      );
      addStyleProp(
        "border-right-color",
        parseColor(declaration.value.color, parseOptions),
      );
      addStyleProp(
        "border-left-width",
        parseBorderSideWidth(declaration.value.width, parseOptions),
      );
      addStyleProp(
        "border-right-width",
        parseBorderSideWidth(declaration.value.width, parseOptions),
      );
      return;
    case "border-inline-start":
      addStyleProp(
        "border-left-color",
        parseColor(declaration.value.color, parseOptions),
      );
      addStyleProp(
        "border-left-width",
        parseBorderSideWidth(declaration.value.width, parseOptions),
      );
      return;
    case "border-inline-end":
      addStyleProp(
        "border-right-color",
        parseColor(declaration.value.color, parseOptions),
      );
      addStyleProp(
        "border-right-width",
        parseBorderSideWidth(declaration.value.width, parseOptions),
      );
      return;
    case "flex-direction":
      return addStyleProp(declaration.property, declaration.value);
    case "flex-wrap":
      return addStyleProp(declaration.property, declaration.value);
    case "flex-flow":
      addStyleProp("flexWrap", declaration.value.wrap);
      addStyleProp("flexDirection", declaration.value.direction);
      break;
    case "flex-grow":
      return addStyleProp(declaration.property, declaration.value);
    case "flex-shrink":
      return addStyleProp(declaration.property, declaration.value);
    case "flex-basis":
      return addStyleProp(
        declaration.property,
        parseLengthPercentageOrAuto(declaration.value, parseOptions),
      );
    case "flex":
      addStyleProp("flex-grow", declaration.value.grow);
      addStyleProp("flex-shrink", declaration.value.shrink);
      addStyleProp(
        "flex-basis",
        parseLengthPercentageOrAuto(declaration.value.basis, parseOptions),
      );
      break;
    case "align-content":
      return addStyleProp(
        declaration.property,
        parseAlignContent(declaration.value, parseOptions),
      );
    case "justify-content":
      return addStyleProp(
        declaration.property,
        parseJustifyContent(declaration.value, parseOptions),
      );
    case "align-self":
      return addStyleProp(
        declaration.property,
        parseAlignSelf(declaration.value, parseOptions),
      );
    case "align-items":
      return addStyleProp(
        declaration.property,
        parseAlignItems(declaration.value, parseOptions),
      );
    case "row-gap":
      return addStyleProp("row-gap", parseGap(declaration.value, parseOptions));
    case "column-gap":
      return addStyleProp("row-gap", parseGap(declaration.value, parseOptions));
    case "gap":
      addStyleProp("row-gap", parseGap(declaration.value.row, parseOptions));
      addStyleProp(
        "column-gap",
        parseGap(declaration.value.column, parseOptions),
      );
      return;
    case "margin":
      handleStyleShorthand("margin", {
        "margin-top": parseSize(declaration.value.top, parseOptions),
        "margin-bottom": parseSize(declaration.value.bottom, parseOptions),
        "margin-left": parseSize(declaration.value.left, parseOptions),
        "margin-right": parseSize(declaration.value.right, parseOptions),
      });
      return;
    case "margin-top":
      return addStyleProp(
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "margin-bottom":
      return addStyleProp(
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "margin-left":
      return addStyleProp(
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "margin-right":
      return addStyleProp(
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "margin-block-start":
      return addStyleProp(
        "margin-start",
        parseLengthPercentageOrAuto(declaration.value, parseOptions),
      );
    case "margin-block-end":
      return addStyleProp(
        "margin-end",
        parseLengthPercentageOrAuto(declaration.value, parseOptions),
      );
    case "margin-inline-start":
      return addStyleProp(
        "margin-start",
        parseLengthPercentageOrAuto(declaration.value, parseOptions),
      );
    case "margin-inline-end":
      return addStyleProp(
        "margin-end",
        parseLengthPercentageOrAuto(declaration.value, parseOptions),
      );
    case "margin-block":
      handleStyleShorthand("margin-block", {
        "margin-start": parseLengthPercentageOrAuto(
          declaration.value.blockStart,
          parseOptions,
        ),
        "margin-end": parseLengthPercentageOrAuto(
          declaration.value.blockEnd,
          parseOptions,
        ),
      });
      return;
    case "margin-inline":
      handleStyleShorthand("margin-inline", {
        "margin-start": parseLengthPercentageOrAuto(
          declaration.value.inlineStart,
          parseOptions,
        ),
        "margin-end": parseLengthPercentageOrAuto(
          declaration.value.inlineEnd,
          parseOptions,
        ),
      });
      return;
    case "padding":
      handleStyleShorthand("padding", {
        "padding-top": parseSize(declaration.value.top, parseOptions),
        "padding-left": parseSize(declaration.value.left, parseOptions),
        "padding-right": parseSize(declaration.value.right, parseOptions),
        "padding-bottom": parseSize(declaration.value.bottom, parseOptions),
      });
      break;
    case "padding-top":
      return addStyleProp(
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "padding-bottom":
      return addStyleProp(
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "padding-left":
      return addStyleProp(
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "padding-right":
      return addStyleProp(
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "padding-block-start":
      return addStyleProp(
        "padding-start",
        parseLengthPercentageOrAuto(declaration.value, parseOptions),
      );
    case "padding-block-end":
      return addStyleProp(
        "padding-end",
        parseLengthPercentageOrAuto(declaration.value, parseOptions),
      );
    case "padding-inline-start":
      return addStyleProp(
        "padding-start",
        parseLengthPercentageOrAuto(declaration.value, parseOptions),
      );
    case "padding-inline-end":
      return addStyleProp(
        "padding-end",
        parseLengthPercentageOrAuto(declaration.value, parseOptions),
      );
    case "padding-block":
      handleStyleShorthand("padding-block", {
        "padding-start": parseLengthPercentageOrAuto(
          declaration.value.blockStart,
          parseOptions,
        ),
        "padding-end": parseLengthPercentageOrAuto(
          declaration.value.blockEnd,
          parseOptions,
        ),
      });
      return;
    case "padding-inline":
      handleStyleShorthand("padding-inline", {
        "padding-start": parseLengthPercentageOrAuto(
          declaration.value.inlineStart,
          parseOptions,
        ),
        "padding-end": parseLengthPercentageOrAuto(
          declaration.value.inlineEnd,
          parseOptions,
        ),
      });
      return;
    case "font-weight":
      return addStyleProp(
        declaration.property,
        parseFontWeight(declaration.value, parseOptions),
      );
    case "font-size":
      return addStyleProp(
        declaration.property,
        parseFontSize(declaration.value, parseOptions),
      );
    case "font-family":
      return addStyleProp(
        declaration.property,
        parseFontFamily(declaration.value),
      );
    case "font-style":
      return addStyleProp(
        declaration.property,
        parseFontStyle(declaration.value, parseOptions),
      );
    case "font-variant-caps":
      return addStyleProp(
        declaration.property,
        parseFontVariantCaps(declaration.value, parseOptions),
      );
    case "line-height":
      return addStyleProp(
        declaration.property,
        parseLineHeight(declaration.value, parseOptions),
      );
    case "font":
      addStyleProp(
        declaration.property + "-family",
        parseFontFamily(declaration.value.family),
      );
      addStyleProp(
        "line-height",
        parseLineHeight(declaration.value.lineHeight, parseOptions),
      );
      addStyleProp(
        declaration.property + "-size",
        parseFontSize(declaration.value.size, parseOptions),
      );
      addStyleProp(
        declaration.property + "-style",
        parseFontStyle(declaration.value.style, parseOptions),
      );
      addStyleProp(
        declaration.property + "-variant",
        parseFontVariantCaps(declaration.value.variantCaps, parseOptions),
      );
      addStyleProp(
        declaration.property + "-weight",
        parseFontWeight(declaration.value.weight, parseOptions),
      );
      return;
    case "vertical-align":
      return addStyleProp(
        declaration.property,
        parseVerticalAlign(declaration.value, parseOptions),
      );
    case "transition-property":
    case "transition-duration":
    case "transition-delay":
    case "transition-timing-function":
    case "transition":
      return addTransitionProp(declaration);
    case "animation-duration":
    case "animation-timing-function":
    case "animation-iteration-count":
    case "animation-direction":
    case "animation-play-state":
    case "animation-delay":
    case "animation-fill-mode":
    case "animation-name":
    case "animation":
      return addAnimationProp(declaration.property, declaration.value);
    case "transform": {
      if (declaration.value.length === 0) {
        addStyleProp("perspective", undefined);
        addStyleProp("translateX", undefined);
        addStyleProp("translateY", undefined);
        addStyleProp("rotate", undefined);
        addStyleProp("rotateX", undefined);
        addStyleProp("rotateY", undefined);
        addStyleProp("rotateZ", undefined);
        addStyleProp("scale", undefined);
        addStyleProp("scaleX", undefined);
        addStyleProp("scaleY", undefined);
        addStyleProp("skewX", undefined);
        addStyleProp("skewY", undefined);
        break;
      }

      for (const transform of declaration.value) {
        switch (transform.type) {
          case "perspective":
            addStyleProp(
              "perspective",
              parseLength(transform.value, parseOptions),
            );
            break;
          case "translate":
            addStyleProp(
              "translateX",
              parseLengthOrCoercePercentageToRuntime(
                transform.value[0],
                "rnw",
                parseOptions,
              ),
            );
            addStyleProp(
              "translateY",
              parseLengthOrCoercePercentageToRuntime(
                transform.value[1],
                "rnh",
                parseOptions,
              ),
            );
            break;
          case "translateX":
            addStyleProp(
              "translateX",
              parseLengthOrCoercePercentageToRuntime(
                transform.value,
                "rnw",
                parseOptions,
              ),
            );
            break;
          case "translateY":
            addStyleProp(
              "translateY",
              parseLengthOrCoercePercentageToRuntime(
                transform.value,
                "rnh",
                parseOptions,
              ),
            );
            break;
          case "rotate":
            addStyleProp("rotate", parseAngle(transform.value, parseOptions));
            break;
          case "rotateX":
            addStyleProp("rotateX", parseAngle(transform.value, parseOptions));
            break;
          case "rotateY":
            addStyleProp("rotateY", parseAngle(transform.value, parseOptions));
            break;
          case "rotateZ":
            addStyleProp("rotateZ", parseAngle(transform.value, parseOptions));
            break;
          case "scale":
            handleStyleShorthand("scale", {
              scaleX: parseLength(transform.value[0], parseOptions),
              scaleY: parseLength(transform.value[1], parseOptions),
            });
            break;
          case "scaleX":
            addStyleProp("scaleX", parseLength(transform.value, parseOptions));
            break;
          case "scaleY":
            addStyleProp("scaleY", parseLength(transform.value, parseOptions));
            break;
          case "skew":
            addStyleProp("skewX", parseAngle(transform.value[0], parseOptions));
            addStyleProp("skewY", parseAngle(transform.value[1], parseOptions));
            break;
          case "skewX":
            addStyleProp("skewX", parseAngle(transform.value, parseOptions));
            break;
          case "skewY":
            addStyleProp("skewY", parseAngle(transform.value, parseOptions));
            break;

          case "translateZ":
          case "translate3d":
          case "scaleZ":
          case "scale3d":
          case "rotate3d":
          case "matrix":
          case "matrix3d":
            break;
        }
      }
      return;
    }
    case "translate":
      addStyleProp(
        "transformX",
        parseLength(declaration.value.x, parseOptions),
      );
      addStyleProp(
        "transformY",
        parseLength(declaration.value.y, parseOptions),
      );
      return;
    case "rotate":
      addStyleProp("rotateX", parseAngle(declaration.value.x, parseOptions));
      addStyleProp("rotateY", parseAngle(declaration.value.y, parseOptions));
      addStyleProp("rotateZ", parseAngle(declaration.value.z, parseOptions));
      return;
    case "scale":
      addStyleProp("scaleX", parseLength(declaration.value.x, parseOptions));
      addStyleProp("scaleY", parseLength(declaration.value.y, parseOptions));
      return;
    case "text-transform":
      return addStyleProp(declaration.property, declaration.value.case);
    case "letter-spacing":
      if (declaration.value.type !== "normal") {
        return addStyleProp(
          declaration.property,
          parseLength(declaration.value.value, parseOptions),
        );
      }
      return;
    case "text-decoration-line":
      return addStyleProp(
        declaration.property,
        parseTextDecorationLine(declaration.value, parseOptions),
      );
    case "text-decoration-color":
      return addStyleProp(
        declaration.property,
        parseColor(declaration.value, parseOptions),
      );
    case "text-decoration":
      addStyleProp(
        "text-decoration-color",
        parseColor(declaration.value.color, parseOptions),
      );
      addStyleProp(
        "text-decoration-line",
        parseTextDecorationLine(declaration.value.line, parseOptions),
      );
      return;
    case "text-shadow":
      return parseTextShadow(declaration.value, addStyleProp, parseOptions);
    case "z-index":
      if (declaration.value.type === "integer") {
        addStyleProp(
          declaration.property,
          parseLength(declaration.value.value, parseOptions),
        );
      } else {
        addWarning({
          type: "IncompatibleNativeValue",
          property: declaration.property,
          value: declaration.value.type,
        });
      }
      return;
    case "container-type":
    case "container-name":
    case "container":
      return addContainerProp(declaration);
    case "text-decoration-style":
      return addStyleProp(
        declaration.property,
        parseTextDecorationStyle(declaration.value, parseOptions),
      );
    case "text-align":
      return addStyleProp(
        declaration.property,
        parseTextAlign(declaration.value, parseOptions),
      );
    case "box-shadow": {
      return addStyleProp(
        declaration.property,
        parseBoxShadow(declaration.value, parseOptions),
      );
    }
    case "aspect-ratio": {
      return addStyleProp(
        declaration.property,
        parseAspectRatio(declaration.value),
      );
    }
    default: {
      /**
       * This is used to know when lightningcss has added a new property and we need to add it to the
       * switch.
       *
       * If your build fails here, its because you have a newer version of lightningcss installed.
       */
      declaration satisfies never;
    }
  }
}

const invalidIdent = new Set(["auto", "inherit"]);

const validProperties = [
  "align-content",
  "align-items",
  "align-self",
  "animation",
  "animation-delay",
  "animation-direction",
  "animation-duration",
  "animation-fill-mode",
  "animation-iteration-count",
  "animation-name",
  "animation-play-state",
  "animation-timing-function",
  "aspect-ratio",
  "background-color",
  "block-size",
  "border",
  "border-block",
  "border-block-color",
  "border-block-end",
  "border-block-end-color",
  "border-block-end-width",
  "border-block-start",
  "border-block-start-color",
  "border-block-start-width",
  "border-block-width",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-width",
  "border-color",
  "border-end-end-radius",
  "border-end-start-radius",
  "border-inline",
  "border-inline-color",
  "border-inline-end",
  "border-inline-end-color",
  "border-inline-end-width",
  "border-inline-start",
  "border-inline-start-color",
  "border-inline-start-width",
  "border-inline-width",
  "border-left",
  "border-left-color",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-width",
  "border-start-end-radius",
  "border-start-start-radius",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-width",
  "border-width",
  "bottom",
  "box-shadow",
  "color",
  "column-gap",
  "container",
  "container-name",
  "container-type",
  "display",
  "flex",
  "flex-basis",
  "flex-direction",
  "flex-flow",
  "flex-grow",
  "flex-shrink",
  "flex-wrap",
  "font",
  "font-family",
  "font-size",
  "font-style",
  "font-variant-caps",
  "font-weight",
  "gap",
  "height",
  "inline-size",
  "inset",
  "inset-block",
  "inset-block-end",
  "inset-block-start",
  "inset-inline",
  "inset-inline-end",
  "inset-inline-start",
  "justify-content",
  "left",
  "letter-spacing",
  "line-height",
  "margin",
  "margin-block",
  "margin-block-end",
  "margin-block-start",
  "margin-bottom",
  "margin-inline",
  "margin-inline-end",
  "margin-inline-start",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-block-size",
  "max-height",
  "max-inline-size",
  "max-width",
  "min-block-size",
  "min-height",
  "min-inline-size",
  "min-width",
  "opacity",
  "overflow",
  "padding",
  "padding-block",
  "padding-block-end",
  "padding-block-start",
  "padding-bottom",
  "padding-inline",
  "padding-inline-end",
  "padding-inline-start",
  "padding-left",
  "padding-right",
  "padding-top",
  "position",
  "right",
  "rotate",
  "row-gap",
  "scale",
  "text-align",
  "text-decoration",
  "text-decoration-color",
  "text-decoration-line",
  "text-decoration-style",
  "text-shadow",
  "text-transform",
  "top",
  "transform",
  "transition",
  "transition-delay",
  "transition-duration",
  "transition-property",
  "transition-timing-function",
  "translate",
  "vertical-align",
  "width",
  "z-index",
] as const;

const validPropertiesLoose = new Set<string>(validProperties);

function isValid<T extends Declaration | PropertyId>(
  declaration: T,
): declaration is Extract<T, { property: (typeof validProperties)[number] }> {
  return validPropertiesLoose.has(declaration.property);
}

function reduceParseUnparsed(
  tokenOrValues: TokenOrValue[],
  options: ParseDeclarationOptionsWithValueWarning,
  allowUnwrap = false,
) {
  const result = tokenOrValues
    .flatMap((tokenOrValue) => parseUnparsed(tokenOrValue, options))
    .filter((v) => v !== undefined);

  if (result.length === 0) {
    return undefined;
  } else if (result.length === 1 && allowUnwrap) {
    return result[0];
  } else {
    return result;
  }
}

function unparsedFunction(
  token: Extract<TokenOrValue, { type: "function" }>,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  return {
    type: "runtime",
    name: token.value.name,
    arguments: reduceParseUnparsed(token.value.arguments, options),
  };
}

function unparsedKnownShorthand(
  mapping: Record<string, TokenOrValue>,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  return Object.entries(mapping).map(([name, tokenOrValue]) => {
    return {
      type: "runtime",
      name,
      arguments: [parseUnparsed(tokenOrValue, options)],
    };
  });
}

/**
 * When the CSS cannot be parsed (often due to a runtime condition like a CSS variable)
 * This function best efforts parsing it into a function that we can evaluate at runtime
 */
function parseUnparsed(
  tokenOrValue: TokenOrValue | TokenOrValue[] | string | number | undefined,
  options: ParseDeclarationOptionsWithValueWarning,
): string | number | object | undefined {
  if (tokenOrValue === undefined) {
    return;
  }

  if (typeof tokenOrValue === "string") {
    return tokenOrValue;
  }

  if (typeof tokenOrValue === "number") {
    return round(tokenOrValue);
  }

  if (Array.isArray(tokenOrValue)) {
    return reduceParseUnparsed(tokenOrValue, options, true);
  }

  switch (tokenOrValue.type) {
    case "unresolved-color": {
      const value = tokenOrValue.value;
      if (value.type === "rgb") {
        return {
          type: "runtime",
          name: "rgba",
          arguments: [
            round(value.r * 255),
            round(value.g * 255),
            round(value.b * 255),
            parseUnparsed(tokenOrValue.value.alpha, options),
          ],
        };
      } else {
        return {
          type: "runtime",
          name: tokenOrValue.value.type,
          arguments: [
            value.h,
            value.s,
            value.l,
            parseUnparsed(tokenOrValue.value.alpha, options),
          ],
        };
      }
    }
    case "var": {
      return {
        type: "runtime",
        name: "var",
        arguments: [tokenOrValue.value.name.ident, tokenOrValue.value.fallback],
      };
    }
    case "function": {
      switch (tokenOrValue.value.name) {
        case "rgb":
          tokenOrValue.value.name = "rgb";
          return unparsedFunction(tokenOrValue, options);
        case "hsl":
          tokenOrValue.value.name = "hsla";
          return unparsedFunction(tokenOrValue, options);
        case "translate":
          return unparsedKnownShorthand(
            {
              translateX: tokenOrValue.value.arguments[0],
              translateY: tokenOrValue.value.arguments[2],
            },
            options,
          );
        case "scale":
          return unparsedKnownShorthand(
            {
              scaleX: tokenOrValue.value.arguments[0],
              scaleY: tokenOrValue.value.arguments[2],
            },
            options,
          );
        case "rotate":
        case "skewX":
        case "skewY":
        case "scaleX":
        case "scaleY":
          return unparsedFunction(tokenOrValue, options);
        case "platformColor":
        case "getPixelSizeForLayoutSize":
        case "roundToNearestPixel":
        case "pixelScale":
        case "fontScale":
        case "shadow":
          return unparsedFunction(tokenOrValue, options);
        case "hairlineWidth":
          return {
            type: "runtime",
            name: tokenOrValue.value.name,
            arguments: [],
          };
        case "platformSelect":
        case "fontScaleSelect":
        case "pixelScaleSelect":
          return parseRNRuntimeSpecificsFunction(
            tokenOrValue.value.name,
            tokenOrValue.value.arguments,
            options,
          );
        default: {
          options.addFunctionValueWarning(tokenOrValue.value.name);
          return;
        }
      }
    }
    case "length":
      return parseLength(tokenOrValue.value, options);
    case "angle":
      return parseAngle(tokenOrValue.value, options);
    case "token":
      switch (tokenOrValue.value.type) {
        case "string":
        case "number":
        case "ident":
          if (invalidIdent.has(tokenOrValue.value.value.toString())) {
            return options.addValueWarning(tokenOrValue.value.value);
          } else {
            return tokenOrValue.value.value;
          }
        case "function":
          options.addValueWarning(tokenOrValue.value.value);
          return;
        case "percentage":
          options.addValueWarning(`${tokenOrValue.value.value}%`);
          return;
        case "dimension":
          return parseDimension(tokenOrValue.value, options);
        case "at-keyword":
        case "hash":
        case "id-hash":
        case "unquoted-url":
        case "delim":
        case "white-space":
        case "comment":
        case "colon":
        case "semicolon":
        case "comma":
        case "include-match":
        case "dash-match":
        case "prefix-match":
        case "suffix-match":
        case "substring-match":
        case "cdo":
        case "cdc":
        case "parenthesis-block":
        case "square-bracket-block":
        case "curly-bracket-block":
        case "bad-url":
        case "bad-string":
        case "close-parenthesis":
        case "close-square-bracket":
        case "close-curly-bracket":
          return;
        default: {
          tokenOrValue.value satisfies never;
          return;
        }
      }
    case "color":
      return parseColor(tokenOrValue.value, options);
    case "url":
    case "env":
    case "time":
    case "resolution":
    case "dashed-ident":
      return;
  }

  tokenOrValue satisfies never;
}

export function parseLength(
  length:
    | number
    | Length
    | DimensionPercentageFor_LengthValue
    | NumberOrPercentage
    | LengthValue,
  options: ParseDeclarationOptionsWithValueWarning,
): number | string | RuntimeValue | undefined {
  const { inlineRem = 14 } = options;

  if (typeof length === "number") {
    return length;
  }

  if ("unit" in length) {
    switch (length.unit) {
      case "px":
        return length.value;
      case "rem":
        if (typeof inlineRem === "number") {
          return length.value * inlineRem;
        } else {
          return {
            type: "runtime",
            name: "rem",
            arguments: [length.value],
          };
        }
      case "vw":
      case "vh":
        return {
          type: "runtime",
          name: length.unit,
          arguments: [length.value],
        };
      case "in":
      case "cm":
      case "mm":
      case "q":
      case "pt":
      case "pc":
      case "em":
      case "ex":
      case "rex":
      case "ch":
      case "rch":
      case "cap":
      case "rcap":
      case "ic":
      case "ric":
      case "lh":
      case "rlh":
      case "lvw":
      case "svw":
      case "dvw":
      case "cqw":
      case "lvh":
      case "svh":
      case "dvh":
      case "cqh":
      case "vi":
      case "svi":
      case "lvi":
      case "dvi":
      case "cqi":
      case "vb":
      case "svb":
      case "lvb":
      case "dvb":
      case "cqb":
      case "vmin":
      case "svmin":
      case "lvmin":
      case "dvmin":
      case "cqmin":
      case "vmax":
      case "svmax":
      case "lvmax":
      case "dvmax":
      case "cqmax":
        options.addValueWarning(`${length.value}${length.unit}`);
        return undefined;
    }

    length.unit satisfies never;
  } else {
    switch (length.type) {
      case "calc": {
        return undefined;
      }
      case "number": {
        return round(length.value);
      }
      case "percentage": {
        return `${round(length.value * 100)}%`;
      }
      case "dimension":
      case "value": {
        return parseLength(length.value, options);
      }
    }
  }
  return undefined;
}

function parseAngle(
  angle: Angle | number,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  if (typeof angle === "number") {
    return `${angle}deg`;
  }

  switch (angle.type) {
    case "deg":
    case "rad":
      return `${angle.value}${angle.type}`;
    default:
      options.addValueWarning(angle.value);
      return undefined;
  }
}

type ParseSizeOptions = ParseDeclarationOptionsWithValueWarning & {
  allowAuto?: boolean;
};

function parseSize(
  size: Size | MaxSize,
  { allowAuto = false, ...options }: ParseSizeOptions,
) {
  switch (size.type) {
    case "length-percentage":
      return parseLength(size.value, options);
    case "none":
      return size.type;
    case "auto":
      if (allowAuto) {
        return size.type;
      } else {
        options.addValueWarning(size.type);
        return undefined;
      }
    case "min-content":
    case "max-content":
    case "fit-content":
    case "fit-content-function":
    case "stretch":
    case "contain":
      options.addValueWarning(size.type);
      return undefined;
  }

  size satisfies never;
}

function parseColor(
  color: CssColor,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  switch (color.type) {
    case "rgb":
      return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.alpha})`;
    case "hsl":
      return `hsla(${color.h}, ${color.s}, ${color.l}, ${color.alpha})`;
    case "currentcolor":
      options.addValueWarning(color.type);
      return;
    case "lab":
    case "lch":
    case "oklab":
    case "oklch":
    case "srgb":
    case "srgb-linear":
    case "display-p3":
    case "a98-rgb":
    case "prophoto-rgb":
    case "rec2020":
    case "xyz-d50":
    case "xyz-d65":
    case "hwb":
      options.addValueWarning(`Invalid color unit ${color.type}`);
      return undefined;
  }

  color satisfies never;
}

function parseLengthPercentageOrAuto(
  lengthPercentageOrAuto: LengthPercentageOrAuto,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  switch (lengthPercentageOrAuto.type) {
    case "auto":
      options.addValueWarning(lengthPercentageOrAuto.type);
      return;
    case "length-percentage":
      return parseLength(lengthPercentageOrAuto.value, options);
  }
  lengthPercentageOrAuto satisfies never;
}

function parseJustifyContent(
  justifyContent: JustifyContent,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  const allowed = new Set([
    "flex-start",
    "flex-end",
    "center",
    "space-between",
    "space-around",
    "space-evenly",
  ]);

  let value: string | undefined;

  switch (justifyContent.type) {
    case "normal":
    case "left":
    case "right":
      value = justifyContent.type;
      break;
    case "content-distribution":
    case "content-position":
      value = justifyContent.value;
      break;
    default: {
      justifyContent satisfies never;
    }
  }

  if (value && !allowed.has(value)) {
    options.addValueWarning(value);
    return;
  }

  return value;
}

function parseAlignContent(
  alignContent: AlignContent,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  const allowed = new Set([
    "flex-start",
    "flex-end",
    "center",
    "stretch",
    "space-between",
    "space-around",
  ]);

  let value: string | undefined;

  switch (alignContent.type) {
    case "normal":
    case "baseline-position":
      value = alignContent.type;
      break;
    case "content-distribution":
    case "content-position":
      value = alignContent.value;
      break;
    default: {
      alignContent satisfies never;
    }
  }

  if (value && !allowed.has(value)) {
    options.addValueWarning(value);
    return;
  }

  return value;
}

function parseAlignItems(
  alignItems: AlignItems,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  const allowed = new Set([
    "auto",
    "flex-start",
    "flex-end",
    "center",
    "stretch",
    "baseline",
  ]);

  let value: string | undefined;

  switch (alignItems.type) {
    case "normal":
      value = "auto";
      break;
    case "stretch":
      value = alignItems.type;
      break;
    case "baseline-position":
      value = "baseline";
      break;
    case "self-position":
      value = alignItems.value;
      break;
    default: {
      alignItems satisfies never;
    }
  }

  if (value && !allowed.has(value)) {
    options.addValueWarning(value);
    return;
  }

  return value;
}

function parseAlignSelf(
  alignSelf: AlignSelf,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  const allowed = new Set([
    "auto",
    "flex-start",
    "flex-end",
    "center",
    "stretch",
    "baseline",
  ]);

  let value: string | undefined;

  switch (alignSelf.type) {
    case "normal":
    case "auto":
      value = "auto";
    case "stretch":
      value = alignSelf.type;
      break;
    case "baseline-position":
      value = "baseline";
      break;
    case "self-position":
      value = alignSelf.value;
      break;
    default: {
      alignSelf satisfies never;
    }
  }

  if (value && !allowed.has(value)) {
    options.addValueWarning(value);
    return;
  }

  return value;
}

function parseFontWeight(
  fontWeight: FontWeight,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  switch (fontWeight.type) {
    case "absolute":
      if (fontWeight.value.type === "weight") {
        return fontWeight.value.value.toString();
      } else {
        return fontWeight.value.type;
      }
    case "bolder":
    case "lighter":
      options.addValueWarning(fontWeight.type);
      return;
  }

  fontWeight satisfies never;
}

function parseTextShadow(
  [textShadow]: TextShadow[],
  addStyleProp: AddStyleProp,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  addStyleProp("textShadowColor", parseColor(textShadow.color, options));
  addStyleProp("textShadowOffset", [
    parseLength(textShadow.xOffset, options),
    parseLength(textShadow.yOffset, options),
  ]);
  addStyleProp("textShadowRadius", parseLength(textShadow.blur, options));
}

function parseTextDecorationStyle(
  textDecorationStyle: TextDecorationStyle,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  const allowed = new Set(["solid", "double", "dotted", "dashed"]);

  if (allowed.has(textDecorationStyle)) {
    return textDecorationStyle;
  }

  options.addValueWarning(textDecorationStyle);
  return undefined;
}

function parseTextDecorationLine(
  textDecorationLine: TextDecorationLine,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  if (!Array.isArray(textDecorationLine)) {
    if (textDecorationLine === "none") {
      return textDecorationLine;
    }
    options.addValueWarning(textDecorationLine);
    return;
  }

  const set = new Set(textDecorationLine);

  if (set.has("underline")) {
    if (set.has("line-through")) {
      return "underline line-through";
    } else {
      return "underline";
    }
  } else if (set.has("line-through")) {
    return "line-through";
  }

  options.addValueWarning(textDecorationLine.join(" "));
  return undefined;
}

function parseOverflow(
  overflow: OverflowKeyword,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  const allowed = new Set(["visible", "hidden"]);

  if (allowed.has(overflow)) {
    return overflow;
  }

  options.addValueWarning(overflow);
  return undefined;
}

function parseBorderStyle(
  borderStyle: BorderStyle | LineStyle,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  const allowed = new Set(["solid", "dotted", "dashed"]);

  if (typeof borderStyle === "string") {
    if (allowed.has(borderStyle)) {
      return borderStyle;
    } else {
      options.addValueWarning(borderStyle);
      return undefined;
    }
  } else if (
    borderStyle.top === borderStyle.bottom &&
    borderStyle.top === borderStyle.left &&
    borderStyle.top === borderStyle.right &&
    allowed.has(borderStyle.top)
  ) {
    return borderStyle.top;
  }

  options.addValueWarning(JSON.stringify(borderStyle.top));

  return undefined;
}

function parseBorderSideWidth(
  borderSideWidth: BorderSideWidth,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  if (borderSideWidth.type === "length") {
    return parseLength(borderSideWidth.value, options);
  }

  options.addValueWarning(borderSideWidth.type);
  return undefined;
}

function parseVerticalAlign(
  verticalAlign: VerticalAlign,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  if (verticalAlign.type === "length") {
    return undefined;
  }

  const allowed = new Set(["auto", "top", "bottom", "middle"]);

  if (allowed.has(verticalAlign.value)) {
    return verticalAlign.value;
  }

  options.addValueWarning(verticalAlign.value);
  return undefined;
}

function parseFontFamily(fontFamily: FontFamily[]) {
  // React Native only allows one font family - better hope this is the right one :)
  return fontFamily[0];
}

function parseLineHeight(
  lineHeight: LineHeight,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  switch (lineHeight.type) {
    case "normal":
      return undefined;
    case "number":
      return {
        type: "runtime",
        name: "em",
        arguments: [lineHeight.value],
      };
    case "length": {
      const length = lineHeight.value;

      switch (length.type) {
        case "dimension":
          return parseLength(length, options);
        case "percentage":
        case "calc":
          options.addValueWarning(length.value);
          return undefined;
      }

      length satisfies never;
    }
  }

  lineHeight satisfies never;
}

function parseFontSize(
  fontSize: FontSize,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  switch (fontSize.type) {
    case "length":
      return parseLength(fontSize.value, options);
    case "absolute":
    case "relative":
      options.addValueWarning(fontSize.value);
      return undefined;
  }
  fontSize satisfies never;
}

function parseFontStyle(
  fontStyle: FontStyle,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  switch (fontStyle.type) {
    case "normal":
    case "italic":
      return fontStyle.type;
    case "oblique":
      options.addValueWarning(fontStyle.type);
      return undefined;
  }

  fontStyle satisfies never;
}

function parseFontVariantCaps(
  fontVariantCaps: FontVariantCaps,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  const allowed = new Set([
    "small-caps",
    "oldstyle-nums",
    "lining-nums",
    "tabular-nums",
    "proportional-nums",
  ]);
  if (allowed.has(fontVariantCaps)) {
    return fontVariantCaps;
  }

  options.addValueWarning(fontVariantCaps);
  return undefined;
}

function parseLengthOrCoercePercentageToRuntime(
  value: Length | DimensionPercentageFor_LengthValue | NumberOrPercentage,
  runtimeName: string,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  if (value.type === "percentage") {
    options.requiresLayout(runtimeName);
    return {
      type: "runtime",
      name: runtimeName,
      arguments: [value.value],
    };
  } else {
    return parseLength(value, options);
  }
}

function parseGap(
  value: GapValue,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  if (value.type === "normal") {
    options.addValueWarning(value.type);
    return;
  }

  return parseLength(value.value, options);
}

function parseRNRuntimeSpecificsFunction(
  name: string,
  args: TokenOrValue[],
  options: ParseDeclarationOptionsWithValueWarning,
) {
  let key: string | undefined;
  const runtimeArgs: Record<string, unknown> = {};

  for (const token of args) {
    if (!key) {
      if (
        token.type === "token" &&
        (token.value.type === "ident" || token.value.type === "number")
      ) {
        key = token.value.value.toString();
        continue;
      }
    } else {
      if (token.type !== "token") {
        const value = parseUnparsed(token, options);
        if (value === undefined) {
          return;
        }
        runtimeArgs[key] = value;
        key = undefined;
      } else {
        switch (token.value.type) {
          case "string":
          case "number":
          case "ident": {
            if (key) {
              runtimeArgs[key] = parseUnparsed(token, options);
              key = undefined;
            } else {
              return;
            }
          }
          case "delim":
          case "comma":
            continue;
          case "function":
          case "at-keyword":
          case "hash":
          case "id-hash":
          case "unquoted-url":
          case "percentage":
          case "dimension":
          case "white-space":
          case "comment":
          case "colon":
          case "semicolon":
          case "include-match":
          case "dash-match":
          case "prefix-match":
          case "suffix-match":
          case "substring-match":
          case "cdo":
          case "cdc":
          case "parenthesis-block":
          case "square-bracket-block":
          case "curly-bracket-block":
          case "bad-url":
          case "bad-string":
          case "close-parenthesis":
          case "close-square-bracket":
          case "close-curly-bracket":
            return undefined;
        }
      }
    }
  }

  return {
    type: "runtime",
    name,
    arguments: [runtimeArgs],
  };
}

function parseTextAlign(
  textAlign: TextAlign,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  const allowed = new Set(["auto", "left", "right", "center", "justify"]);
  if (allowed.has(textAlign)) {
    return textAlign;
  }

  options.addValueWarning(textAlign);
  return undefined;
}

function parseBoxShadow(
  boxShadows: BoxShadow[],
  options: ParseDeclarationOptionsWithValueWarning,
) {
  if (boxShadows.length > 1) {
    options.addValueWarning("multiple box shadows");
    return;
  }

  const boxShadow = boxShadows[0];

  options.addStyleProp("shadowColor", parseColor(boxShadow.color, options));
  options.addStyleProp("shadowRadius", parseLength(boxShadow.spread, options));
  options.addStyleProp("shadowOffset", {
    width: parseLength(boxShadow.xOffset, options),
    height: parseLength(boxShadow.yOffset, options),
  });
}

function parseDisplay(
  display: Display,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  if (display.type === "keyword") {
    if (display.value === "none") {
      return display.value;
    } else {
      return options.addValueWarning(display.value);
    }
  } else if (display.type === "pair") {
    if (display.outside === "block") {
      switch (display.inside.type) {
        case "flow":
          if (display.isListItem) {
            return options.addValueWarning("list-item");
          } else {
            return options.addValueWarning("block");
          }
        case "flow-root":
          return options.addValueWarning("flow-root");
        case "table":
          return options.addValueWarning(display.inside.type);
        case "flex":
          return display.inside.type;
        case "box":
        case "grid":
        case "ruby":
          return options.addValueWarning(display.inside.type);
      }
    } else {
      switch (display.inside.type) {
        case "flow":
          return options.addValueWarning("inline");
        case "flow-root":
          return options.addValueWarning("inline-block");
        case "table":
          return options.addValueWarning("inline-table");
        case "flex":
          return options.addValueWarning("inline-flex");
        case "box":
        case "grid":
          return options.addValueWarning("inline-grid");
        case "ruby":
          return options.addValueWarning(display.inside.type);
      }
    }
  }
}

function parseAspectRatio(
  // This is missing types
  aspectRatio: any,
) {
  if (aspectRatio.auto) {
    return "auto";
  } else {
    if (aspectRatio.ratio[0] === aspectRatio.ratio[1]) {
      return 1;
    } else {
      return aspectRatio.ratio.join(" / ");
    }
  }
}

function parseDimension(
  { unit, value }: Extract<Token, { type: "dimension" }>,
  options: ParseDeclarationOptionsWithValueWarning,
) {
  switch (unit) {
    case "px":
      return value;
    case "%":
      return `${value}%`;
    case "rnh":
    case "rnw":
      return {
        type: "runtime",
        name: unit,
        arguments: [value / 100],
      };
    default: {
      return options.addValueWarning(`${value}${unit}`);
    }
  }
}

function round(number: number) {
  return Math.round((number + Number.EPSILON) * 100) / 100;
}
