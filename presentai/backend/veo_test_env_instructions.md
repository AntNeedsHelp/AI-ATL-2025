# Veo Test Environment

## Activate the virtual environment:

```bash
cd /Users/rishidesai/Documents/AI-ATL-2025/presentai/backend
source veo_test_env/bin/activate
```

## Check google-genai installation:

```bash
pip show google-genai
```

## Explore the package:

```bash
python3 -c "from google.genai import types; import inspect; print(inspect.getsourcefile(types.Part))"
```

## Check available methods:

```bash
python3 -c "from google.genai import types; part = types.Part.from_bytes(b'test', 'image/png'); print([m for m in dir(part) if not m.startswith('_')])"
```

## Test generate_videos:

```bash
python3 -c "from google import genai; client = genai.Client(api_key='YOUR_KEY'); print(hasattr(client.models, 'generate_videos'))"
```

## Exit the virtual environment:

```bash
deactivate
```

