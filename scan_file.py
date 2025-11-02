import os
import sys
from pathlib import Path

def load_gitignore_patterns(root_dir):
    """Load and parse .gitignore patterns"""
    patterns = []
    gitignore_path = os.path.join(root_dir, '.gitignore')
    
    if os.path.exists(gitignore_path):
        try:
            with open(gitignore_path, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        patterns.append(line)
        except Exception as e:
            print(f"Warning: Could not read .gitignore: {e}")
    
    return patterns

def should_ignore(path, patterns, root_dir):
    """Check if a path should be ignored based on .gitignore patterns"""
    try:
        # Get relative path from root directory
        rel_path = os.path.relpath(path, root_dir)
        
        # Always ignore .git directory
        if '.git' in Path(path).parts:
            return True
            
        # Check if this is the root directory itself
        if rel_path == '.':
            return False
            
        # Check each pattern
        for pattern in patterns:
            # Skip empty patterns
            if not pattern:
                continue
                
            # Handle directory patterns (ending with /)
            if pattern.endswith('/'):
                pattern = pattern.rstrip('/')
                # If it's a directory and matches the pattern, ignore it
                if os.path.isdir(path) and (rel_path == pattern or rel_path.startswith(pattern + os.sep)):
                    return True
            else:
                # Simple file/directory name matching
                if fnmatch_path(rel_path, pattern) or fnmatch_path(os.path.basename(path), pattern):
                    return True
                    
    except Exception as e:
        print(f"Warning: Error checking ignore for {path}: {e}")
        
    return False

def fnmatch_path(path, pattern):
    """Simple pattern matching for gitignore patterns"""
    path = path.replace('\\', '/')
    pattern = pattern.replace('\\', '/')
    
    if pattern.startswith('*/'):
        pattern = pattern[2:]
        return path.endswith(pattern) or pattern in path
    elif pattern.startswith('**/'):
        pattern = pattern[3:]
        return pattern in path
    else:
        return path == pattern or path.endswith('/' + pattern) or pattern in path

def read_file_content(file_path):
    """Read file content with proper encoding handling"""
    try:
        # Try to read as text file
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            return content
    except UnicodeDecodeError:
        try:
            # Try different encoding
            with open(file_path, 'r', encoding='latin-1', errors='ignore') as f:
                return f.read()
        except Exception as e:
            return f"[Binary file or cannot read: {str(e)}]"
    except Exception as e:
        return f"[Error reading file: {str(e)}]"

def scan_directory_simple(root_dir, output_file):
    """Simplified directory scanning with better debugging"""
    print(f"Loading .gitignore patterns from {root_dir}...")
    gitignore_patterns = load_gitignore_patterns(root_dir)
    print(f"Found {len(gitignore_patterns)} gitignore patterns")
    
    file_count = 0
    ignored_count = 0
    
    with open(output_file, 'w', encoding='utf-8') as out_f:
        out_f.write(f"Directory Structure and File Contents for: {root_dir}\n")
        out_f.write("=" * 80 + "\n\n")
        
        print("Starting directory scan...")
        
        for root, dirs, files in os.walk(root_dir):
            # Print progress for debugging
            print(f"Scanning: {root} ({len(files)} files)")
            
            # Filter directories first
            dirs_to_remove = []
            for d in dirs:
                dir_path = os.path.join(root, d)
                if should_ignore(dir_path, gitignore_patterns, root_dir):
                    dirs_to_remove.append(d)
                    ignored_count += 1
            
            for d in dirs_to_remove:
                dirs.remove(d)
            
            # Write directory header
            rel_path = os.path.relpath(root, root_dir)
            if rel_path != '.':
                out_f.write(f"\n📁 DIRECTORY: {rel_path}\n")
                out_f.write("-" * 60 + "\n")
            
            # Process files
            for file in files:
                file_path = os.path.join(root, file)
                
                if should_ignore(file_path, gitignore_patterns, root_dir):
                    ignored_count += 1
                    continue
                
                file_count += 1
                print(f"  Reading: {file}")
                
                out_f.write(f"\n📄 FILE: {file}\n")
                out_f.write(f"📍 Path: {file_path}\n")
                out_f.write("-" * 40 + "\n")
                
                content = read_file_content(file_path)
                out_f.write(content)
                
                if content and not content.endswith('\n'):
                    out_f.write('\n')
                out_f.write("-" * 40 + "\n\n")
        
        # Summary
        out_f.write(f"\n\nSUMMARY:\n")
        out_f.write(f"Total files processed: {file_count}\n")
        out_f.write(f"Total files ignored: {ignored_count}\n")
    
    return file_count, ignored_count

def main():
    # Get directory to scan
    if len(sys.argv) > 1:
        root_directory = sys.argv[1]
    else:
        root_directory = os.getcwd()
    
    # Validate directory
    if not os.path.exists(root_directory):
        print(f"Error: Directory '{root_directory}' does not exist.")
        return
    
    root_directory = os.path.abspath(root_directory)
    output_filename = "directory_contents.txt"
    
    print(f"🔍 Scanning directory: {root_directory}")
    print(f"💾 Output file: {output_filename}")
    print("Please wait...\n")
    
    try:
        file_count, ignored_count = scan_directory_simple(root_directory, output_filename)
        print(f"\n✅ Scan completed!")
        print(f"📊 Files processed: {file_count}")
        print(f"🚫 Files ignored: {ignored_count}")
        print(f"💾 Output saved to: {output_filename}")
        
    except Exception as e:
        print(f"❌ Error during scanning: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()