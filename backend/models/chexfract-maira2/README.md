---
language:
- multilingual
pipeline_tag: image-text-to-text
tags:
- vision
widget:
- messages:
  - role: user
    content: <|image_1|>\nDescribe bones on this chest X-ray?
library_name: transformers
---
# ChexFract: Specialized Vision-Language Models for Fracture Detection in Chest X-rays

This repository contains the pre-trained models from our paper "ChexFract: From General to Specialized - Enhancing Fracture Description Generation in Medical AI".

## 📋 Overview

ChexFract models are specialized vision-language models fine-tuned for accurate fracture detection and description in chest X-ray images. These models significantly outperform general-purpose radiology report generation systems on fracture-specific tasks.

## 🏆 Model Performance

### Released Models

We release two best-performing models, each optimized for their respective encoder architecture:

1. **ChexFract-MAIRA-2** (Best F1-Score with MAIRA-2 encoder)
   - **Configuration:** Templated text + Fine-tuned encoder (unfrozen)
   - **ROC-AUC:** 0.713
   - **F1-Score:** 0.629
   - **Accuracy:** 0.748
   - **Precision:** 0.682
   - **Recall:** 0.584

2. **ChexFract-CheXagent** (Best F1-Score with CheXagent encoder)
   - **Configuration:** Templated text + Fine-tuned encoder (unfrozen)
   - **ROC-AUC:** 0.697
   - **F1-Score:** 0.591
   - **Accuracy:** 0.752
   - **Precision:** 0.750
   - **Recall:** 0.487

## 🚀 Quick Start

### Installation

```bash
pip install torch torchvision transformers pillow
```

### Basic Usage

**Using MAIRA-2 encoder model:**
```python
from transformers import AutoModelForCausalLM, AutoProcessor
from PIL import Image

# Load model and processor
model = AutoModelForCausalLM.from_pretrained("AIRI-Institute/chexfract-maira2", trust_remote_code=True)
processor = AutoProcessor.from_pretrained("AIRI-Institute/chexfract-maira2", trust_remote_code=True)


messages = [{"role": "user", "content": "<|image_1|>\nDescribe bones on this chest X-ray"}]

# Load chest X-ray image
image = Image.open("chest_xray.png")
prompt = processor.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)

# Generate fracture description
inputs = processor(prompt, image, return_tensors="pt")
outputs = model.generate(**inputs, eos_token_id=processor.tokenizer.eos_token_id, max_new_tokens=1024)
description = processor.decode(outputs[0, inputs['input_ids'].shape[1]:], skip_special_tokens=True)

print(f"Fracture description: {description}")
```


## 📈 Performance Comparison

| Model | ROC-AUC | F1-Score | Accuracy | Precision | Recall |
|-------|---------|----------|----------|-----------|--------|
| General MAIRA-2 (baseline) | 0.518 | 0.085 | 0.645 | 0.777 | 0.045 |
| **ChexFract-MAIRA-2** | **0.713** | **0.629** | **0.748** | **0.682** | **0.584** |
| General CheXagent (baseline) | 0.604 | 0.376 | 0.700 | 0.791 | 0.246 |
| **ChexFract-CheXagent** | **0.697** | **0.591** | **0.752** | **0.750** | **0.487** |

## 🔬 Model Architecture

Both models share the same architecture but use different visual encoders:

- **ChexFract-MAIRA-2:**
  - **Visual Encoder:** [Rad-DINO (from MAIRA-2)](https://huggingface.co/microsoft/rad-dino-maira-2)
  - **Language Model:** [Phi-3.5 Vision Instruct](https://huggingface.co/microsoft/Phi-3.5-vision-instruct) (3.8B parameters)
  - **Training:** Fine-tuned encoder (unfrozen) + templated text on ChexFract dataset

- **ChexFract-CheXagent:**
  - **Visual Encoder:** [CheXagent-2-3b encoder](https://huggingface.co/StanfordAIMI/CheXagent-2-3b)
  - **Language Model:** [Phi-3.5 Vision Instruct](https://huggingface.co/microsoft/Phi-3.5-vision-instruct) (3.8B parameters)
  - **Training:** Fine-tuned encoder (unfrozen) + templated text on ChexFract dataset

## ⚠️ Limitations and Clinical Use

**Important:** These models are designed for **research purposes**. They are **NOT intended for standalone diagnostic use**.

## 📝 Citation

If you use these models in your research, please cite:

```bibtex
@article{chexfract2025,
  title={ChexFract: From General to Specialized - Enhancing Fracture Description Generation in Medical AI},
  author={Nechaev, Nikolay and Przhezdzetskaia, Evgeniia and Umerenkov, Dmitry and Dylov, Dmitry V.},
  journal={arXiv preprint arXiv:XXXX.XXXXX},
  year={2025},
  institution={Artificial Intelligence Research Institute (AIRI)}
}
```

## 📄 License

### Model License

**Important:** These models are derivative works based on multiple pre-trained models. The license for these models is subject to the most restrictive terms among the base model licenses.

**Effective License:** These models are provided under terms compatible with the most restrictive license among the base model licenses. Users must comply with ALL applicable base model licenses.

**Base Model Licenses:**
- **Rad-DINO encoder (from MAIRA-2):** Microsoft Research License Agreement (MSRLA) - see [microsoft/rad-dino-maira-2](https://huggingface.co/microsoft/rad-dino-maira-2) for full terms
- **CheXagent-2-3b encoder:** Creative Commons Attribution Non Commercial 4.0 (CC-BY-NC-4.0) - see [StanfordAIMI/CheXagent-2-3b](https://huggingface.co/StanfordAIMI/CheXagent-2-3b) for full terms
- **Phi-3.5 Vision Instruct:** MIT License - see [microsoft/Phi-3.5-vision-instruct](https://huggingface.co/microsoft/Phi-3.5-vision-instruct) for full license terms

**⚠️ IMPORTANT - Commercial Use Restrictions:**
- **CheXagent-2-3b** uses CC-BY-NC-4.0, which **PROHIBITS commercial use** without explicit permission
- **Rad-DINO (MAIRA-2)** uses MSRLA, which typically has **restrictions on commercial use** without permission
- **Phi-3.5** uses MIT License, which allows commercial use

**The most restrictive license applies:** These models are **NOT licensed for commercial use** due to CC-BY-NC-4.0 and MSRLA restrictions. For commercial use, you must obtain appropriate licenses from the original model owners.

**Before using these models, you must:**
1. Review the license terms of all base models in their original repositories
2. Ensure your use case complies with all applicable licenses (especially for commercial purposes)
3. Include appropriate attribution and copyright notices as required by each license
4. Obtain commercial licenses if needed from model owners (Microsoft for MAIRA-2, Stanford for CheXagent)

### Additional License Information

The fine-tuning code and modifications specific to this work may be subject to additional licensing terms. Please review all applicable licenses before commercial use.

## 👥 Authors

- **Nikolay Nechaev** - Artificial Intelligence Research Institute (AIRI)
- **Evgeniia Przhezdzetskaia** - Artificial Intelligence Research Institute (AIRI)
- **Dmitry Umerenkov** - Artificial Intelligence Research Institute (AIRI)
- **Dmitry V. Dylov** - Artificial Intelligence Research Institute (AIRI)

## 🔗 Related Resources

- **Paper:** [arXiv](https://arxiv.org/abs/2511.07983)

## 🙏 Acknowledgments

We thank the contributors to the MIMIC-CXR, PadChest, BIMCV-COVID19, CheXpert, and OpenI datasets for making their data publicly available. We also acknowledge the computational resources provided for this research.

## 📧 Contact

For questions or issues, please contact:
- **Email:** nechaev@airi.net
- **Institution:** Artificial Intelligence Research Institute (AIRI), Moscow, Russia

---

**Disclaimer:** These models are provided for research purposes only. They are not intended for clinical use without proper validation and regulatory approval.

