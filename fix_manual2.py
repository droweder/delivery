with open('server.ts') as f: lines = f.readlines()

for i, line in enumerate(lines):
    if 'catch (e) {}' in line:
        pass # it was on one line: } catch (e) {}
    elif 'return mov;' in line:
        pass
