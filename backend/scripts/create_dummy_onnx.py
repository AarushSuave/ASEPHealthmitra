"""Create a dummy universal fracture classification model in ONNX format."""
import os
import torch
import torch.nn as nn

class DummyFractureModel(nn.Module):
    def __init__(self):
        super().__init__()
        # A simple linear layer mapping average color to 10 classes
        self.fc = nn.Linear(3, 10)
        
        # Initialize weights to give interesting and stable predictions
        with torch.no_grad():
            self.fc.bias.fill_(0.0)
            self.fc.bias[9] = 1.0  # Index 9 is "healthy" - favor healthy by default
            
            # Let's initialize weights: shape (10, 3)
            self.fc.weight.fill_(0.1)
            self.fc.weight[9, 2] = 0.5  # Blue channel promotes healthy
            self.fc.weight[0, 0] = 0.8  # Red channel promotes comminuted
            self.fc.weight[1, 1] = 0.6  # Green channel promotes greenstick

    def forward(self, x):
        # Input shape: (batch, 224, 224, 3)
        # Average pool over height and width (dimensions 1 and 2)
        x_mean = x.mean(dim=(1, 2))  # shape: (batch, 3)
        return self.fc(x_mean)       # shape: (batch, 10)

def create_model():
    model = DummyFractureModel()
    model.eval()
    
    # Create dummy input of shape (1, 224, 224, 3)
    dummy_input = torch.randn(1, 224, 224, 3, dtype=torch.float32)
    
    # Define models directory
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(backend_dir, "models")
    os.makedirs(models_dir, exist_ok=True)
    
    onnx_path = os.path.join(models_dir, "fracture_model.onnx")
    
    # Export to ONNX
    torch.onnx.export(
        model,
        dummy_input,
        onnx_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}}
    )
    print(f"ONNX model exported successfully to: {onnx_path}")
    print(f"File size: {os.path.getsize(onnx_path)} bytes")

if __name__ == "__main__":
    create_model()
