import { Instance } from "../../types/instance";
import { tokenRegex, token } from "../../utils/formatting";
import { Plugin } from "../../types/options";

export interface InpuitValidationConfig {
  dateFormat: string;
  placeholder: string;
  instantValidate: boolean;
  invalidClassName: string;
  isValidAttrName: string
}

const inputValidationConfig: InpuitValidationConfig = {
  dateFormat: "d/m/Y H:i",
  placeholder: "",
  instantValidate: true,
  invalidClassName: "format-invalid",
  isValidAttrName: "data-is-valid"
};

function inputValidation(pluginConfig?: Partial<InpuitValidationConfig>): Plugin {
    const config = { ...inputValidationConfig, ...pluginConfig };
    let separator: string;
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

      function handleDuration(date: string) {
        const inputs = [
          parent.hourElement as HTMLInputElement,
          parent.minuteElement as HTMLInputElement,
          parent.secondElement as HTMLInputElement
        ]
        
        let arr = date.split(separator);
        if (arr.length < 1)
          return;
        arr.forEach((val, i: number) => {
          if (isNaN(parseInt(val)) || i > 2)
            return;
          if (inputs[i])
            inputs[i].value = val;
        })
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
              if (parent.loadedPlugins.indexOf("duration") === -1)
                oldSetDate(date, triggerChange, format);
              else
                handleDuration(date.toString());
            }
            else{
              whenInvalid();
            }
        }
      }

      function setup() {
        parent.input.placeholder = config.placeholder ? config.placeholder : config.dateFormat;
      }

      function constructRegEx() {
        constructedRe = parent.config.dateFormat
          .split("")
          .map((c, i, arr) => {
            if(c == "I") //temp workaround for duration plugin
              return "(\\d\\d)";
            else if( tokenRegex[c as token] && arr[i - 1] !== "\\")
              return tokenRegex[c as token];
            else if (c !== "\\") {
              separator = c;
              return "\\" + c
            }
            else 
              return "";
          })
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