#!/usr/bin/env python3
"""Test MCP protocol functionality with the eventuali MCP server."""

import json
import subprocess
import sys
import asyncio
from pathlib import Path

# Add the current directory to the path so we can import our modules
sys.path.insert(0, str(Path(__file__).parent))


def test_mcp_initialization():
    """Test MCP server initialization via subprocess."""
    print("Testing MCP server initialization...")
    
    try:
        # Start the MCP server as a subprocess
        process = subprocess.Popen(
            ["uv", "run", "main.py"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=Path(__file__).parent
        )
        
        # Send MCP initialization request
        init_request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "test-client",
                    "version": "1.0.0"
                }
            }
        }
        
        # Send the request
        request_json = json.dumps(init_request) + "\n"
        print(f"Sending: {request_json.strip()}")
        
        process.stdin.write(request_json)
        process.stdin.flush()
        
        # Read response with timeout
        try:
            response_line = process.stdout.readline()
            if response_line:
                response = json.loads(response_line.strip())
                print(f"Received: {json.dumps(response, indent=2)}")
                
                # Check if initialization was successful
                if "result" in response:
                    print("✅ MCP server initialized successfully!")
                    print(f"Server capabilities: {response['result'].get('capabilities', {})}")
                    return True
                else:
                    print(f"❌ MCP initialization failed: {response}")
                    return False
            else:
                print("❌ No response from MCP server")
                return False
                
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse MCP response: {e}")
            print(f"Raw response: {response_line}")
            return False
            
        finally:
            # Clean up process
            process.terminate()
            process.wait(timeout=5)
            
    except Exception as e:
        print(f"❌ MCP test failed: {e}")
        return False


def test_mcp_tools_list():
    """Test listing available MCP tools."""
    print("\nTesting MCP tools listing...")
    
    try:
        # Start the MCP server as a subprocess
        process = subprocess.Popen(
            ["uv", "run", "main.py"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=Path(__file__).parent
        )
        
        # Send initialization first
        init_request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "test-client", "version": "1.0.0"}
            }
        }
        
        process.stdin.write(json.dumps(init_request) + "\n")
        process.stdin.flush()
        
        # Read init response
        init_response = process.stdout.readline()
        
        # Send initialized notification (required by MCP protocol)
        initialized_notification = {
            "jsonrpc": "2.0",
            "method": "notifications/initialized"
        }
        process.stdin.write(json.dumps(initialized_notification) + "\n")
        process.stdin.flush()
        
        # Send tools list request
        tools_request = {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/list",
            "params": {}
        }
        
        request_json = json.dumps(tools_request) + "\n"
        print(f"Sending: {request_json.strip()}")
        
        process.stdin.write(request_json)
        process.stdin.flush()
        
        # Read response
        response_line = process.stdout.readline()
        if response_line:
            response = json.loads(response_line.strip())
            print(f"Received: {json.dumps(response, indent=2)}")
            
            if "result" in response and "tools" in response["result"]:
                tools = response["result"]["tools"]
                print(f"✅ Found {len(tools)} MCP tools:")
                for tool in tools:
                    print(f"  - {tool['name']}: {tool.get('description', 'No description')}")
                return True
            else:
                print(f"❌ Tools list failed: {response}")
                return False
        else:
            print("❌ No response from MCP server")
            return False
            
    except Exception as e:
        print(f"❌ MCP tools test failed: {e}")
        return False
    finally:
        process.terminate()
        process.wait(timeout=5)


def test_mcp_resources_list():
    """Test listing available MCP resources."""
    print("\nTesting MCP resources listing...")
    
    try:
        # Start the MCP server as a subprocess
        process = subprocess.Popen(
            ["uv", "run", "main.py"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=Path(__file__).parent
        )
        
        # Send initialization first
        init_request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "test-client", "version": "1.0.0"}
            }
        }
        
        process.stdin.write(json.dumps(init_request) + "\n")
        process.stdin.flush()
        
        # Read init response
        init_response = process.stdout.readline()
        
        # Send initialized notification (required by MCP protocol)
        initialized_notification = {
            "jsonrpc": "2.0",
            "method": "notifications/initialized"
        }
        process.stdin.write(json.dumps(initialized_notification) + "\n")
        process.stdin.flush()
        
        # Send resources list request
        resources_request = {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "resources/list",
            "params": {}
        }
        
        request_json = json.dumps(resources_request) + "\n"
        print(f"Sending: {request_json.strip()}")
        
        process.stdin.write(request_json)
        process.stdin.flush()
        
        # Read response
        response_line = process.stdout.readline()
        if response_line:
            response = json.loads(response_line.strip())
            print(f"Received: {json.dumps(response, indent=2)}")
            
            if "result" in response and "resources" in response["result"]:
                resources = response["result"]["resources"]
                print(f"✅ Found {len(resources)} MCP resources:")
                for resource in resources:
                    print(f"  - {resource['uri']}: {resource.get('description', 'No description')}")
                return True
            else:
                print(f"❌ Resources list failed: {response}")
                return False
        else:
            print("❌ No response from MCP server")
            return False
            
    except Exception as e:
        print(f"❌ MCP resources test failed: {e}")
        return False
    finally:
        process.terminate()
        process.wait(timeout=5)


def main():
    """Run all MCP protocol tests."""
    print("🧪 Starting MCP Protocol Tests")
    print("=" * 50)
    
    tests = [
        ("MCP Initialization", test_mcp_initialization),
        ("MCP Tools List", test_mcp_tools_list),
        ("MCP Resources List", test_mcp_resources_list),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        print(f"\n📝 Running test: {test_name}")
        print("-" * 40)
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            failed += 1
            print(f"❌ Test error in {test_name}: {e}")
    
    # Summary
    print("\n" + "=" * 50)
    print("🏁 MCP Protocol Test Summary")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"📊 Success Rate: {passed/(passed+failed)*100:.1f}%")
    
    if failed == 0:
        print("\n🎉 All MCP protocol tests passed!")
        return True
    else:
        print(f"\n⚠️  {failed} test(s) failed.")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)