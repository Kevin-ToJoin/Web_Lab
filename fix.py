import sys

path = '/Users/Dogui/Documents/Antigravity/Web_Lab/admin_100_bugs_guide.html'
with open(path, 'r') as f:
    content = f.read()

start_str = "but still displays the '"
end_str = " symbol.\",\"find\":"

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    start_cut = start_idx + len(start_str)
    fixed_content = content[:start_cut] + "$" + content[end_idx:]
    with open(path, 'w') as f:
        f.write(fixed_content)
    print("Fixed copy-paste error successfully.")
else:
    print("Could not find markers.")

