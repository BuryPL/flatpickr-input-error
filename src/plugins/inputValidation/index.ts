import { Instance } from "../../types/instance";
import { tokenRegex, token } from "../../utils/formatting";
import { Plugin } from "../../types/options";

export interface InpuitValidationConfig {
  dateFormat: string;
  placeholder: string;
  invalidClassName: string;
  isValidAttrName: string
}

const inputValidationConfig: InpuitValidationConfig = {
  dateFormat: "d/m/Y H:i",
  placeholder: "",
  invalidClassName: "notFilledBg",
  isValidAttrName: "data-is-valid"
};

function inputValidation(pluginConfig?: Partial<InpuitValidationConfig>): Plugin {
    const config = { ...inputValidationConfig, ...pluginConfig };

    let constructedRe: string;
    return (parent: Instance) => {
      parent.config.dateFormat = config.dateFormat;

      function whenValid() {
        parent._input.setAttribute(config.isValidAttrName, 'false');
        parent._input.classList.remove(config.invalidClassName);
      }

      function whenInvalid() {
        parent._input.setAttribute(config.isValidAttrName, 'false');
        parent._input.classList.add(config.invalidClassName);
      }

      function overrideSetDate() {
        let oldSetDate = parent.setDate;
        parent.setDate = function setDate(date: string | number | Date | import("../../types/options").DateOption[],
          triggerChange = false,
          format = config.dateFormat) {
            if (!date) {
              oldSetDate(date, triggerChange, format);
              return;
            }
            let re = new RegExp(constructedRe);
            let isValid = re.test(date.toString());
            if(isValid){
              whenValid();
              oldSetDate(date, triggerChange, format);
            }
            else{
              whenInvalid();
            }
        }
      }

      function setup() {
        parent.element.setAttribute("placeholder", config.placeholder ? config.placeholder : config.dateFormat);
      }

      function constructRegEx() {
        constructedRe = parent.config.dateFormat
          .split("")
          .map((c, i, arr) =>
            tokenRegex[c as token] && arr[i - 1] !== "\\"
              ? tokenRegex[c as token]
              : c !== "\\"
              ? "\\" + c
              : "")
          .join("");
      }

      return {
          onParseConfig() {
            parent.config.mode = "single";
            parent.config.allowInput = true;
          },
          onReady: [
            setup,
              overrideSetDate,
              constructRegEx,
              () => {
                  parent.loadedPlugins.push("inputValidation");
              },
          ]
        };
    };
}  

export default inputValidation;