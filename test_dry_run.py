#!/usr/bin/env python3
"""
Basic tests for the DRY_RUN functionality
"""

import os
import json
import tempfile
import subprocess
import sys
from pathlib import Path


def test_dry_run_with_dummy_secrets():
    """Test that dummy secrets trigger DRY_RUN mode"""
    env = os.environ.copy()
    env.update({
        'OPENAI_API_KEY': 'dummy',
        'NOTION_TOKEN': 'dummy', 
        'NOTION_DB_ID': 'dummy'
    })
    
    result = subprocess.run([sys.executable, 'main.py'], 
                          env=env, capture_output=True, text=True)
    
    assert result.returncode == 0, f"Process failed: {result.stderr}"
    assert "DRY_RUN" in result.stdout
    assert "✅ DRY_RUN完了" in result.stdout
    print("✅ Test 1 passed: Dummy secrets trigger DRY_RUN")


def test_dry_run_with_empty_secrets():
    """Test that empty secrets trigger DRY_RUN mode"""
    env = os.environ.copy()
    # Remove any existing API keys
    for key in ['OPENAI_API_KEY', 'NOTION_TOKEN', 'NOTION_DB_ID']:
        env.pop(key, None)
    
    result = subprocess.run([sys.executable, 'main.py'],
                          env=env, capture_output=True, text=True)
    
    assert result.returncode == 0, f"Process failed: {result.stderr}"
    assert "DRY_RUN" in result.stdout
    assert "✅ DRY_RUN完了" in result.stdout
    print("✅ Test 2 passed: Empty secrets trigger DRY_RUN")


def test_explicit_dry_run():
    """Test explicit DRY_RUN=true"""
    env = os.environ.copy()
    env.update({
        'DRY_RUN': 'true',
        'OPENAI_API_KEY': 'real_key',
        'NOTION_TOKEN': 'real_token',
        'NOTION_DB_ID': 'real_db'
    })
    
    result = subprocess.run([sys.executable, 'main.py'],
                          env=env, capture_output=True, text=True)
    
    assert result.returncode == 0, f"Process failed: {result.stderr}"
    assert "DRY_RUN" in result.stdout
    assert "✅ DRY_RUN完了" in result.stdout
    print("✅ Test 3 passed: Explicit DRY_RUN=true works")


def test_json_output():
    """Test that JSON output is valid"""
    env = os.environ.copy()
    env['DRY_RUN'] = 'true'
    
    # Run in a temporary directory
    with tempfile.TemporaryDirectory() as tmpdir:
        os.chdir(tmpdir)
        
        # Copy source files
        import shutil
        src_dir = Path(__file__).parent
        shutil.copytree(src_dir / 'src', Path(tmpdir) / 'src')
        shutil.copy(src_dir / 'main.py', tmpdir)
        
        result = subprocess.run([sys.executable, 'main.py'],
                              env=env, capture_output=True, text=True)
        
        assert result.returncode == 0, f"Process failed: {result.stderr}"
        
        # Check JSON file was created
        json_files = list(Path('.').glob('weekly_menu_*.json'))
        assert len(json_files) == 1, f"Expected 1 JSON file, got {len(json_files)}"
        
        # Validate JSON content
        with open(json_files[0]) as f:
            data = json.load(f)
        
        assert data['dry_run'] is True
        assert 'week_plan' in data
        assert 'meals' in data['week_plan']
        assert len(data['week_plan']['meals']) == 7  # 7 days
        
        print("✅ Test 4 passed: JSON output is valid")


if __name__ == '__main__':
    # Change to script directory
    os.chdir(Path(__file__).parent)
    
    print("Running DRY_RUN functionality tests...")
    
    try:
        test_dry_run_with_dummy_secrets()
        test_dry_run_with_empty_secrets() 
        test_explicit_dry_run()
        test_json_output()
        
        print("\n🎉 All tests passed!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)