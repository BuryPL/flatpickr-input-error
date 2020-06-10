import { Instance } from "../../types/instance";
import { tokenRegex, token } from "../../utils/formatting";
import { Plugin } from "../../types/options";

export interface InpuitValidationConfig {
  dateFormat: string;
  placeholder: string;
  instantValidate: boolean;
  invalidClassName: string;
  isValidAttrName: string;
  attributesToCopy: string[];
}

const inputValidationConfig: InpuitValidationConfig = {
  dateFormat: "d/m/Y H:i",
  placeholder: "",
  instantValidate: true,
  invalidClassName: "format-invalid",
  isValidAttrName: "data-is-valid",
  attributesToCopy: ['style', 'readonly', 'disabled']
};

function inputValidation(pluginConfig?: Partial<InpuitValidationConfig>): Plugin {
    const config = { ...inputValidationConfig, ...pluginConfig };
    let constructedRe: string;
    let separator: string;
    let standinInput: HTMLInputElement;

    return (parent: Instance) => {
      function adjustConfig() {
        if (pluginConfig?.attributesToCopy)
          config.attributesToCopy = inputValidationConfig.attributesToCopy.concat(pluginConfig.attributesToCopy);
      }
      
      let invalidValueAttribute: string = "data-invalid-value";
      parent.config.dateFormat = config.dateFormat;


      function assignAttributes(targetElement: Element) {
        config.attributesToCopy.forEach((attr) => {
        let originalReadonly= parent.element.attributes.getNamedItem(attr);
        if (originalReadonly)
          targetElement.setAttribute(attr, originalReadonly.value);
        })
      }

      function createAdditionalInput() {
        let standinInputLocal = parent._createElement<HTMLInputElement>(
          "input",
          "flatpickr-input-validation-mock-input"
        );

        parent.element.classList.forEach((val) => { 
          if(val !== 'flatpickr-input')
            standinInputLocal.classList.add(val); 
        });

        standinInputLocal.classList.forEach((val) => {
          parent.element.classList.remove(val);
        });

        standinInputLocal.tabIndex = -1;

        assignAttributes(standinInputLocal);

        standinInputLocal.setAttribute('placeholder', config.placeholder)

        parent.input.parentNode?.appendChild(standinInputLocal);

        standinInput = standinInputLocal as HTMLInputElement;

        parent.element.setAttribute('style', 'width: 0; margin: 0; padding: 0; border: 0;')
        //parent.element.remove();
      }

      function appendEventListeners() {
        parent._bind(standinInput, 'blur', onBlur)
        standinInput.addEventListener("click", localOnClick)
      }

      function onBlur(e?: any) {
        if (!e || !e.target || !e.target.value)
          whenInvalid("");
        if (checkIfValid(e.target.value)){
          parent.input.value = e.target.value;
          whenValid();
          if (parent.loadedPlugins.indexOf("duration") !== -1)
            durationOnValid(e.target.value);
          else
            parent.input.dispatchEvent(new Event('blur'));
        }
        else 
          whenInvalid(e.target.value);
      }

      function localOnClick(e: any) {
        e?.stopPropagation();
        parent.open(e, standinInput);
      }

      function whenValid() {
        
        parent._input.setAttribute(config.isValidAttrName, 'true');
        parent._input.removeAttribute(invalidValueAttribute);
        if (config.instantValidate)
          parent._input.classList.remove(config.invalidClassName);
      }

      function whenInvalid(value: string) {
        parent._input.setAttribute(config.isValidAttrName, 'false');
        parent._input.setAttribute(invalidValueAttribute, value);
        if (config.instantValidate)
          parent._input.classList.add(config.invalidClassName);
      }

      function durationOnValid(date: string) {
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
        });
        if(parent.selectedDates.length !== 0)
          parent.timeContainer?.dispatchEvent(new Event('increment'));
      }

      function checkIfValid(date: string) {
        let re = new RegExp(constructedRe);
        return re.test(date);
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

      function updateValue(newVal: string) {
        if (standinInput.value !== newVal)
          standinInput.value = newVal;
      }

      function valueChanged(parsedDate: Date[], dateString: string) {
        if (parent.loadedPlugins.indexOf("duration") === -1) {
          updateValue(dateString);
        } else {
          if(checkIfValid(dateString)){
            updateValue(dateString);
            whenValid();
          }
          if(false)
            console.log('dateStr', parsedDate);
          let arr = dateString.split(separator);
          if (arr.length < 1)
            return;
          let val = parent._input.getAttribute(invalidValueAttribute);
          if(val && 
            arr[0] === parent.config.defaultHour.toString() &&
            arr[1] === parent.config.defaultMinute.toString()) {
            parent.input.value = val;
          } else {
            updateValue(dateString);
            whenValid();
          }
        }
      }
      
      function onDestroy() {
        if(standinInput) {
          standinInput.removeEventListener("click", localOnClick);
          standinInput.classList.forEach((val) => {
            if(val !== 'flatpickr-input-validation-mock-input')
              parent.element.classList.add(val);
          });
        }
      }

      return {
          onParseConfig() {
            parent.config.mode = "single";
            parent.config.allowInput = true;
            parent.config.clickOpens = false;
          },
          onValueUpdate: valueChanged,
          onReady: [
              adjustConfig,
              constructRegEx,
              createAdditionalInput,
              appendEventListeners,
              () => {
                  parent.loadedPlugins.push("inputValidation");
              },
          ],
          onDestroy: onDestroy
        };
    };
}  

export default inputValidation;